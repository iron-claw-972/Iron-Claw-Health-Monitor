from wpiutil.log import DataLogReader
from typing import Dict, List, Any
import logging
import os
from collections import deque
from logging.handlers import RotatingFileHandler

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Dedicated error log for parsing issues - limited to 2MB
error_log_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "parsing_errors.log")
error_file_handler = RotatingFileHandler(error_log_path, maxBytes=2*1024*1024, backupCount=1)
error_file_handler.setLevel(logging.WARNING)
error_file_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
error_file_handler.setFormatter(error_file_formatter)

parsing_error_logger = logging.getLogger("parsing_errors")
parsing_error_logger.addHandler(error_file_handler)
parsing_error_logger.setLevel(logging.WARNING)
parsing_error_logger.propagate = False 

class TelemetryDataPoint:
    __slots__ = ['timestamp', 'value']
    def __init__(self, timestamp: int, value: Any):
        self.timestamp = timestamp
        self.value = value

# STRICT WHITELIST - Only these attributes will be parsed and stored
WHITELIST_CHANNELS = {
    "/Drive/Module0/DriveCurrentAmps", "/Drive/Module0/TurnCurrentAmps",
    "/Drive/Module1/DriveCurrentAmps", "/Drive/Module1/TurnCurrentAmps",
    "/Drive/Module2/DriveCurrentAmps", "/Drive/Module2/TurnCurrentAmps",
    "/Drive/Module3/DriveCurrentAmps", "/Drive/Module3/TurnCurrentAmps",
    "/DriverStation/EmergencyStop", "/Hood/MotorCurrent",
    "/Intake/LeftCurrent", "/Intake/RightCurrent",
    "/LinearClimb/MotorCurrent", "/PowerDistribution/ChannelCurrent",
    "/PowerDistribution/Faults", "/PowerDistribution/StickyFaults",
    "/PowerDistribution/Temperature", "/PowerDistribution/TotalCurrent",
    "/PowerDistribution/Voltage", "/RealOutputs/Alerts/errors",
    "/RealOutputs/Alerts/warnings", "/RealOutputs/Drivetrain/AccelerationFaults",
    "/RealOutputs/Hood/Voltage", "/RealOutputs/LoggedRobot/FullCycleMS",
    "/RealOutputs/LoggedRobot/UserCodeMS", "/RealOutputs/PathPlanner/errors",
    "/RealOutputs/PathPlanner/warnings", "/RealOutputs/PhotonAlerts/errors",
    "/RealOutputs/PhotonAlerts/warnings", "/RealOutputs/Turret/Voltage",
    "/Spindexer/SpindexerCurrent", "/SystemStats/BatteryCurrent",
    "/SystemStats/BatteryVoltage", "/SystemStats/BrownedOut",
    "/SystemStats/BrownoutVoltage", "/SystemStats/CANBus/OffCount",
    "/SystemStats/CANBus/ReceiveErrorCount", "/SystemStats/CANBus/TransmitErrorCount",
    "/SystemStats/CANBus/TxFullCount", "/SystemStats/CANBus/Utilization",
    "/SystemStats/CPUTempCelsius", "/Turret/MotorCurrent",
    "/Turret/MotorVoltage", "/Vision/CameraBackLeft/Results0/latency_ms",
    "/Vision/CameraBackLeft/Results1/latency_ms", "/Vision/CameraBackLeft/Results2/latency_ms",
    "/Vision/CameraBackLeft/Results3/latency_ms", "/Vision/CameraBackLeft/Results4/latency_ms",
    "/Vision/CameraBackRight/Results0/latency_ms", "/Vision/CameraBackRight/Results1/latency_ms",
    "/Vision/CameraBackRight/Results2/latency_ms", "/Vision/CameraBackRight/Results3/latency_ms",
    "/Vision/CameraBackRight/Results4/latency_ms",
    "/CameraPublisher/CameraBackLeft/Property/white_balance_temperature",
    "/CameraPublisher/CameraBackLeft/PropertyInfo/white_balance_temperature/max",
    "/CameraPublisher/CameraBackLeft/PropertyInfo/white_balance_temperature/min",
    "/CameraPublisher/CameraBackLeft/PropertyInfo/white_balance_temperature/step",
    "/CameraPublisher/CameraFrontRight/Property/white_balance_temperature",
    "/CameraPublisher/CameraFrontRight/PropertyInfo/white_balance_temperature/max",
    "/CameraPublisher/CameraFrontRight/PropertyInfo/white_balance_temperature/min",
    "/CameraPublisher/CameraFrontRight/PropertyInfo/white_balance_temperature/step",
    "/PathPlanner/currentPose", "/PathPlanner/currentPose/translation/x",
    "/PathPlanner/currentPose/translation/y", "/SmartDashboard/Alerts/errors",
    "/SmartDashboard/Alerts/warnings", "/SmartDashboard/PathPlanner/errors",
    "/SmartDashboard/PathPlanner/warnings", "/SmartDashboard/PhotonAlerts/errors",
    "/SmartDashboard/PhotonAlerts/warnings", "/photonvision/CameraBackLeft/fpsLimit",
    "/photonvision/CameraBackLeft/fpsLimitRequest", "/photonvision/CameraBackLeft/latencyMillis",
    "/photonvision/CameraBackRight/fpsLimit", "/photonvision/CameraBackRight/fpsLimitRequest",
    "/photonvision/CameraBackRight/latencyMillis", "/photonvision/CameraFrontLeft/fpsLimit",
    "/photonvision/CameraFrontLeft/fpsLimitRequest", "/photonvision/CameraFrontLeft/latencyMillis",
    "/photonvision/CameraFrontRight/fpsLimit", "/photonvision/CameraFrontRight/fpsLimitRequest",
    "/photonvision/CameraFrontRight/latencyMillis"
}

# Names used for mode detection
MODE_SIGNALS = [
    "/DriverStation/FMSAttached", 
    "/DriverStation/Enabled", 
    "/DriverStation/Autonomous", 
    "/FMSInfo/IsAutonomous",
    "/FMSInfo/FMSControlData"
]

def parse_and_extract_all(log_file_path: str, limit: int = 5000, progress_callback=None) -> Dict[str, Any]:
    logger.info(f"Opening DataLogReader for: {log_file_path}")
    if not os.path.exists(log_file_path):
        logger.error(f"Log file path does not exist: {log_file_path}")
        raise FileNotFoundError(f"Log file not found: {log_file_path}")
    
    file_size = os.path.getsize(log_file_path)
    logger.info(f"File size: {file_size} bytes")
    
    try:
        reader = DataLogReader(log_file_path)
    except Exception as e:
        logger.error(f"Failed to initialize DataLogReader: {e}")
        raise ValueError(f"Invalid log file format: {e}")

    channels_meta = {}
    channels_type_cached = {}
    global_stats = {}
    segment_stats = {} 
    all_data = {} 
    segments = [] 
    
    parsing_stats = {name: 0 for name in WHITELIST_CHANNELS}
    
    fms_attached = False
    enabled = False
    autonomous = False
    
    current_match_start = None
    current_mode_start = None
    current_mode_type = None # "Auto" or "Teleop"
    
    robot_run_start = None
    fms_channel_id = None
    enabled_channel_id = None
    auto_channel_id = None
    
    count = 0
    logger.info("Starting record iteration...")
    
    for record in reader:
        count += 1
        if progress_callback and count % 100000 == 0:
            progress_callback(count)
        
        ts = record.getTimestamp()
        if robot_run_start is None: robot_run_start = ts
        
        try:
            if record.isStart():
                d = record.getStartData()
                # Normalize the name for comparison and DB storage
                clean_name = d.name.replace('NT:/AdvantageKit/', '/').replace('NT:/', '/')
                if not clean_name.startswith('/'): clean_name = '/' + clean_name
                
                # Check against whitelist or mode signals
                if clean_name not in WHITELIST_CHANNELS and clean_name not in MODE_SIGNALS:
                    continue
                
                entry_id = d.entry
                c_type = d.type.lower()
                channels_meta[entry_id] = {'name': clean_name, 'type': d.type}
                channels_type_cached[entry_id] = c_type
                
                if clean_name == "/DriverStation/FMSAttached": fms_channel_id = entry_id
                if clean_name == "/DriverStation/Enabled": enabled_channel_id = entry_id
                if clean_name in ["/DriverStation/Autonomous", "/FMSInfo/IsAutonomous", "/FMSInfo/FMSControlData"]: 
                    auto_channel_id = entry_id
                
                if any(x in c_type for x in ['double', 'float', 'int', 'bool']):
                    global_stats[entry_id] = {'min': float('inf'), 'max': float('-inf'), 'sum': 0.0, 'count': 0}
                    all_data[entry_id] = deque(maxlen=limit)

            elif not record.isControl():
                entry_id = record.getEntry()
                
                # Detect Mode Signals
                mode_changed = False
                if entry_id == fms_channel_id:
                    fms_attached = record.getBoolean()
                elif entry_id == enabled_channel_id:
                    new_enabled = record.getBoolean()
                    if fms_attached:
                        if new_enabled and not enabled: 
                            current_match_start = ts
                        elif not new_enabled and enabled and current_match_start: 
                            segments.append({'type': 'Match', 'start_time': current_match_start, 'end_time': ts, 'name': f"Match {len([s for s in segments if s['type']=='Match'])+1}"})
                            current_match_start = None
                    enabled = new_enabled
                    mode_changed = True
                elif entry_id == auto_channel_id:
                    if channels_meta[entry_id]['name'] == "/FMSInfo/FMSControlData":
                        # FMSControlData bit 1 is autonomous
                        val = record.getInteger()
                        autonomous = bool(val & 0x02)
                    else:
                        autonomous = record.getBoolean()
                    mode_changed = True

                # Track Auto/Teleop Segments
                if mode_changed:
                    new_mode = ("Auto" if autonomous else "Teleop") if enabled else None
                    if new_mode != current_mode_type:
                        if current_mode_type and current_mode_start:
                            segments.append({'type': current_mode_type, 'start_time': current_mode_start, 'end_time': ts, 'name': f"{current_mode_type} Segment"})
                        current_mode_type = new_mode
                        current_mode_start = ts if enabled else None

                # Extract Telemetry
                if entry_id in all_data:
                    c_type = channels_type_cached[entry_id]
                    ch_name = channels_meta[entry_id]['name']
                    val = None
                    try:
                        if 'double' in c_type: val = record.getDouble()
                        elif 'float' in c_type: val = record.getFloat()
                        elif 'int' in c_type: val = record.getInteger()
                        elif 'bool' in c_type: val = 1.0 if record.getBoolean() else 0.0
                    except:
                        try: val = record.getDouble()
                        except:
                            try: val = record.getFloat()
                            except:
                                try: val = float(record.getInteger())
                                except: val = None
                    
                    if val is not None:
                        parsing_stats[ch_name] = parsing_stats.get(ch_name, 0) + 1
                        gs = global_stats[entry_id]
                        if val < gs['min']: gs['min'] = val
                        if val > gs['max']: gs['max'] = val
                        gs['sum'] += float(val)
                        gs['count'] += 1
                        all_data[entry_id].append(TelemetryDataPoint(ts, val))
                        
                        if current_match_start:
                            seg_idx = len([s for s in segments if s['type']=='Match'])
                            if f"match_{seg_idx}" not in segment_stats: segment_stats[f"match_{seg_idx}"] = {}
                            if entry_id not in segment_stats[f"match_{seg_idx}"]:
                                segment_stats[f"match_{seg_idx}"][entry_id] = {'min': float('inf'), 'max': float('-inf'), 'sum': 0.0, 'count': 0}
                            ss = segment_stats[f"match_{seg_idx}"][entry_id]
                            if val < ss['min']: ss['min'] = val
                            if val > ss['max']: ss['max'] = val
                            ss['sum'] += float(val)
                            ss['count'] += 1
                            
        except Exception as e:
            ch_name = channels_meta.get(entry_id, {}).get('name', 'Unknown')
            parsing_error_logger.warning(f"Error parsing record {count} for channel [{ch_name}] at {ts}us: {e}")
            continue

    # Close last segments
    if current_mode_type and current_mode_start:
        segments.append({'type': current_mode_type, 'start_time': current_mode_start, 'end_time': ts, 'name': f"{current_mode_type} Segment"})
    
    segments.append({'type': 'RobotRun', 'start_time': robot_run_start, 'end_time': ts, 'name': "Robot Run 1"})
    
    final_summary = {"full": {}, "segments": {}}
    for eid, gs in global_stats.items():
        if gs['count'] > 0:
            final_summary["full"][eid] = {'min': gs['min'], 'max': gs['max'], 'avg': gs['sum']/gs['count'], 'count': gs['count']}
            
    final_data = {eid: list(points) for eid, points in all_data.items()}

    return {
        'channels': [{'entry_id': k, 'name': v['name'], 'type': v['type']} for k,v in channels_meta.items() if v['name'] in WHITELIST_CHANNELS],
        'summary': final_summary, 
        'data': final_data,
        'segments': segments,
        'parsing_stats': {
            'total_records': count,
            'channel_counts': parsing_stats
        }
    }

def get_channel_data(log_file_path: str, channel_entry_id: int, channel_type: str, limit: int = 5000) -> List[TelemetryDataPoint]:
    return []
