import json
import csv
import os

# Established Rules from code
EXCLUDED_CHANNELS = {
    "/DriverStation/Joystick4/ButtonValues", "/DriverStation/Joystick0/ButtonValues", "/DriverStation/MatchType",
    "/DriverStation/Joystick4/POVs", "/DriverStation/Joystick5/AxisValues", "/DriverStation/Joystick5/POVs",
    "/DriverStation/Joystick0/Name", "/DriverStation/Joystick3/POVs", "/DriverStation/Joystick5/Xbox",
    "/SystemStats/FPGARevision", "/DriverStation/Joystick1/POVs", "/DriverStation/Joystick5/AxisTypes",
    "/DriverStation/Joystick2/Name", "/SystemStats/TeamNumber", "/RealOutputs/LoggedRobot/LogPeriodicMS",
    "/DriverStation/Joystick0/Xbox", "/SystemStats/FPGAButton", "/RealOutputs/Logger/ConsoleMS",
    "/SystemStats/EpochTimeMicros", "/DriverStation/FMSAttached", "/RadioStatus/Connected",
    "/DriverStation/MatchTime", "/DriverStation/Joystick0/AxisTypes", "/DriverStation/Joystick3/Xbox",
    "/DriverStation/Joystick0/Type", "/DriverStation/Joystick3/Type", "/RealOutputs/Odometry/Robot",
    "/.schema/struct:Rotation2d", "/DriverStation/Joystick2/ButtonValues", "/RealOutputs/PathPlanner/.type",
    "/DriverStation/Joystick1/Type", "/RealOutputs/PhotonAlerts/.type", "/DriverStation/DSAttached",
    "/DriverStation/Joystick5/Name", "/RealOutputs/Logger/EntryUpdateMS", "/DriverStation/MatchNumber",
    "/DriverStation/Joystick1/Xbox", "/RealOutputs/Alerts/warnings", "/DriverStation/Joystick4/Name",
    "/DriverStation/Joystick0/AxisValues", "/DriverStation/Joystick3/AxisTypes", "/DriverStation/Joystick2/Type",
    "/DriverStation/Joystick2/AxisTypes", "/DriverStation/Joystick3/Name", "/DriverStation/Test",
    "/DriverStation/Autonomous", "/.schema/struct:Pose2d", "/DriverStation/EventName",
    "/DriverStation/Joystick2/Xbox", "/DriverStation/Joystick0/POVs", "/DriverStation/Joystick3/ButtonValues",
    "/DriverStation/Joystick4/AxisValues", "/DriverStation/ReplayNumber", 
    "/DriverStation/Joystick1/ButtonValues", "/RealOutputs/Logger/DriverStationMS", "/DriverStation/Joystick5/ButtonValues",
    "/DriverStation/Joystick4/Type", "/DriverStation/Joystick1/AxisTypes", "/SystemStats/SerialNumber",
    "/DriverStation/GameSpecificMessage", "/.schema/struct:Translation2d", "/DriverStation/Joystick1/AxisValues",
    "/DriverStation/Joystick4/Xbox", "/DriverStation/Joystick2/POVs", "/RealOutputs/PathPlanner/infos",
    "/DriverStation/Joystick5/Type", "/DriverStation/Joystick1/Name", "/DriverStation/Joystick2/ButtonCount",
    "/DriverStation/Joystick3/ButtonCount", "/DriverStation/Joystick2/AxisValues", "/SystemStats/RSLState",
    "/RealOutputs/PhotonAlerts/infos", "/RealOutputs/desired vel1", "/RealOutputs/desired vel2", "/RealOutputs/desired vel3",
    "/DriverStation/AllianceStation", "/DriverStation/Joystick4/ButtonCount", "/DriverStation/Joystick5/ButtonCount",
    "/RealOutputs/Alerts/.type", "/DriverStation/Joystick3/AxisValues", "/DriverStation/Joystick4/AxisTypes",
    "/DriverStation/Joystick0/ButtonCount", "/DriverStation/Joystick1/ButtonCount", "/Drive/Module3/DriveVelocityRadPerSec",
    "/Drive/Gyro/OdometryYawTimestamps", "/Drive/Module1/OdometryTimestamps", "/Drive/Module1/TurnPosition",
    "/Drive/Gyro/YawPosition", "/.schema/struct:Quaternion", "/Drive/Module0/OdometryDrivePositionsRad",
    "/Drive/Gyro/OdometryYawPositions", "/Drive/Module1/TurnAppliedVolts", "/Vision/CameraFront/Results4",
    "/Vision/CameraFront/Results3", "/Drive/Module3/OdometryDrivePositionsRad", "/RealOutputs/LoggedRobot/GCTimeMS",
    "/Drive/Module1/TurnCurrentAmps", "/Drive/Module2/TurnPosition", "/Drive/Module2/TurnAppliedVolts",
    "/Drive/Module0/TurnPosition", "/Drive/Module2/DriveConnected", "/Drive/Module1/DriveVelocityRadPerSec",
    "/.schema/proto:geometry3d.proto", "/Drive/Module3/TurnConnected", "/RealOutputs/Odometry/module poses",
    "/Drive/Module0/DriveVelocityRadPerSec", "/.schema/struct:Pose3d", "/Drive/Module0/TurnConnected",
    "/Drive/Module1/EncoderOffset", "/Vision/CameraBack/Results4", "/Vision/CameraBack/Results3",
    "/Drive/Module1/DriveCurrentAmps", "/Drive/Module0/TurnVelocityRadPerSec", "/Vision/CameraBack/Results0",
    "/Vision/CameraBack/Results2", "/Vision/CameraBack/Results1", "/Drive/Module2/TurnEncoderConnected",
    "/Vision/CameraBack/Connected", "/Drive/Module1/TurnVelocityRadPerSec", "/Drive/Module1/DrivePositionRad",
    "/Drive/Module1/TurnAbsolutePosition", "/Drive/Module3/TurnAppliedVolts", "/Drive/Module3/OdometryTurnPositions",
    "/Drive/Module2/OdometryTimestamps", "/Drive/Module0/OdometryTimestamps", "/Drive/Module3/OdometryTimestamps",
    "/Drive/Module0/EncoderOffset", "/Drive/Module3/TurnAbsolutePosition", "/Drive/Module0/TurnEncoderConnected",
    "/Drive/Module3/DriveConnected", "/Drive/Module0/TurnAppliedVolts", "/Drive/Module2/TurnCurrentAmps",
    "/Vision/CameraFront/Connected", "/RealOutputs/LoggedRobot/GCCounts", "/Drive/Module3/DriveAppliedVolts",
    "/Drive/Module1/TurnConnected", "/Drive/Module2/DriveAppliedVolts", "/Drive/Module2/DriveVelocityRadPerSec",
    "/Drive/Module2/EncoderOffset", "/Drive/Module1/DriveAppliedVolts", "/Drive/Module2/TurnConnected",
    "/Drive/Module2/OdometryDrivePositionsRad", "/Drive/Gyro/AccelerationX", "/Drive/Gyro/AccelerationY",
    "/Drive/Module0/DriveAppliedVolts", "/Drive/Module2/DrivePositionRad", "/Drive/Module0/DriveConnected",
    "/Drive/Module3/EncoderOffset", "/Drive/Module2/OdometryTurnPositions", "/.schema/struct:Rotation3d",
    "/Drive/Module0/TurnAbsolutePosition", "/Drive/Gyro/YawVelocityRadPerSec", "/Drive/Module0/TurnPositions",
    "/Drive/Module2/DriveCurrentAmps", "/Drive/Module3/DriveCurrentAmps", "/RealOutputs/Angle 2",
    "/RealOutputs/Angle 1", "/RealOutputs/Angle 0", "/Vision/CameraBack/Length", "/Drive/Module2/TurnVelocityRadPerSec",
    "/RealOutputs/Angle 3", "/Drive/Module2/TurnAbsolutePosition", "/Drive/Module3/TurnPosition",
    "/Drive/Gyro/Connected", "/Drive/Module3/TurnVelocityRadPerSec", "/Drive/Module3/TurnEncoderConnected",
    "/.schema/proto:photon.proto", "/Drive/Module0/TurnCurrentAmps", "/Drive/Module1/OdometryDrivePositionsRad",
    "/Vision/CameraFront/Length", "/Drive/Module3/TurnCurrentAmps", "/RealOutputs/ComponentPoses",
    "/Vision/CameraFront/Results0", "/Vision/CameraFront/Results2", "/Vision/CameraFront/Results1",
    "/Drive/Module1/TurnEncoderConnected", "/Drive/Module0/DrivePositionRad", "/Drive/Module0/DriveCurrentAmps",
    "/Drive/Module3/DrivePositionRad", "/Drive/Module1/DriveConnected", "/Drive/Module1/OdometryTurnPositions",
    "/.schema/struct:Translation3d", "/SystemStats/NTClients/AdvantageScope@1/Connected",
    "/SystemStats/NTClients/AdvantageScope@1/IPAddress", "/SystemStats/NTClients/AdvantageScope@1/RemotePort",
    "/SystemStats/NTClients/AdvantageScope@1/ProtocolVersion"
}

HIDDEN_CHANNELS = {
  "/Timestamp", "/SystemStats/5vRail/Active", "/SystemStats/3v3Rail/Current", "/RealOutputs/Logger/RadioLogMS",
  "/SystemStats/6vRail/Active", "/SystemStats/5vRail/Current", "/SystemStats/6vRail/Current", "/SystemStats/BatteryCurrent",
  "/PowerDistribution/TotalEnergy", "/PowerDistribution/TotalCurrent", "/SystemStats/BrownoutVoltage", "/SystemStats/3v3Rail/Active"
}

def categorize():
    try:
        with open('new_log_channels.json', 'r', encoding='utf-16') as f:
            raw_channels = json.load(f)
    except:
        with open('new_log_channels.json', 'r', encoding='utf-8') as f:
            raw_channels = json.load(f)

    # Use the manifest we just generated as "Currently Accepted"
    accepted_names = set()
    with open('robot_telemetry_manifest_v2.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            accepted_names.add(row['Attribute Name'])

    categorized = {
        "New": [],
        "Existing-Hide": [],
        "Existing-Remove": [],
        "Other": []
    }

    seen_clean_names = set()

    for ch in raw_channels:
        name = ch['name']
        clean_name = name.replace('NT:/AdvantageKit/', '/').replace('NT:/', '/')
        if not clean_name.startswith('/'): clean_name = '/' + clean_name

        # Skip sub-indices and schema metadata from "New" categorization
        is_metadata = any(x in clean_name for x in ['/0', '/1', '/2', '/3', '/4', '/5', '/6', '/7', '/8', '/9', '/value', '/length', '/.schema'])

        if clean_name in EXCLUDED_CHANNELS:
            categorized["Existing-Remove"].append(clean_name)
        elif clean_name in HIDDEN_CHANNELS:
            categorized["Existing-Hide"].append(clean_name)
        elif clean_name in accepted_names:
            # Already in our new manifest, skip showing as "New"
            continue
        elif is_metadata:
            # These were effectively removed by my manifest logic
            categorized["Existing-Remove"].append(clean_name)
        else:
            if clean_name not in seen_clean_names:
                categorized["New"].append(clean_name)
                seen_clean_names.add(clean_name)

    # Print summary
    for cat, items in categorized.items():
        items = sorted(list(set(items))) # Unique and sorted
        print(f"\n### {cat} ({len(items)})")
        # Print first 20 if too many
        for item in items[:20]:
            print(f"- {item}")
        if len(items) > 20:
            print(f"... and {len(items)-20} more")

if __name__ == "__main__":
    categorize()
