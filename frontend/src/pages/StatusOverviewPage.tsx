import React, { useState, useEffect, memo, useMemo } from 'react';
import { Box, Typography, Paper, CircularProgress, AppBar, Toolbar, Container, Button, Select, MenuItem, Fab, Zoom, useScrollTrigger } from '@mui/material';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getLogChannels, getLogSummary, getLogFiles } from '../services/api';
import type { Channel, LogFile, SummaryData, SummaryStats } from '../services/api';
import StaticRobotView from '../components/StaticRobotView';
import HomeIcon from '@mui/icons-material/Home';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

// STRICT WHITELIST - Only these attributes will be visible as LEDs
const WHITELIST_CHANNELS = [
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
];

interface ChannelStatus {
  channel: Channel;
  min: number; max: number; avg: number; count: number;
  color: 'green' | 'yellow' | 'orange' | 'red' | 'grey';
  description: string;
}

const FastLed = memo(({ status, onClick }: { status: ChannelStatus, onClick: () => void }) => {
  const isError = status.color === 'red';
  const isWarning = status.color === 'yellow' || status.color === 'orange';
  const titleText = `${status.channel.name}\nStatus: ${status.description}\nAvg: ${status.avg.toFixed(2)}\nRange: [${status.min}, ${status.max}]`;

  if (isError) {
    return (
      <div onClick={onClick} title={titleText} style={{ width: '18px', height: '18px', backgroundColor: '#ff1744', cursor: 'pointer', flexShrink: 0, boxShadow: '0 0 12px #ff1744', borderRadius: '2px' }} />
    );
  }

  if (isWarning) {
    return (
      <div onClick={onClick} title={titleText} style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, filter: `drop-shadow(0 0 4px ${status.color === 'orange' ? '#ff9100' : '#ffea00'})` }}>
        <svg width="20" height="20" viewBox="0 0 24 24"><path d="M12 2L22 21H2L12 2Z" fill={status.color === 'orange' ? '#ff9100' : '#ffea00'} /></svg>
      </div>
    );
  }

  return (
    <div onClick={onClick} title={titleText} style={{ width: '18px', height: '18px', borderRadius: '50%', cursor: 'pointer', backgroundColor: status.color === 'grey' ? '#bdbdbd' : status.color, boxShadow: status.color === 'grey' ? 'none' : `0 0 8px ${status.color}`, border: '1px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
  );
});

const SUBSYSTEM_MAPPING: { [key: string]: string[] } = {
  'Spindexer': ['/spindexer/'],
  'Shooter': ['shooter', 'flywheel', 'hood', 'indexer', 'turret'],
  'Drivetrain': ['drive', 'gyro', 'odometry', 'swerve'],
  'Vision': ['vision', 'photonalerts', 'apriltags'],
  'Intake': ['intake', 'roller', 'deploy'],
  'Climber': ['climber', 'winch', 'hook', 'climb'],
  'Power Subsystem': ['powerdistribution', 'battery'],
  '972_Valence_Platform': ['systemstats', 'radiostatus', 'loggedrobot', 'logger', 'alerts', 'pathplanner', 'dashboard'],
  'Console Messages': ['console', 'comments']
};

const StatusOverviewPage: React.FC = () => {
  const { logId } = useParams<{ logId: string }>();
  const navigate = useNavigate();
  const [logInfo, setLogInfo] = useState<LogFile | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterMode, setFilterMode] = useState<'RobotRun' | 'Match'>('RobotRun');
  const [lookback, setLookback] = useState<string>('All');

  const trigger = useScrollTrigger({ disableHysteresis: true, threshold: 100 });
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  useEffect(() => {
    if (!logId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [logsRes, chRes, sumRes] = await Promise.all([ getLogFiles(), getLogChannels(parseInt(logId)), getLogSummary(parseInt(logId)) ]);
        const currentLog = logsRes.data.find(l => l.id === parseInt(logId));
        if (currentLog) setLogInfo(currentLog);
        setChannels(chRes.data);
        setSummary(sumRes.data);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchData();
  }, [logId]);

  const getStatusColor = (name: string, stats: SummaryStats): { color: 'green' | 'yellow' | 'orange' | 'red' | 'grey', desc: string } => {
    if (stats.count === 0) return { color: 'grey', desc: 'No data.' };
    const { min, max, avg } = stats;
    const n = name.toLowerCase();
    if (n.includes('brownedout') || n.includes('fault') || n.includes('emergencystop')) return { color: max > 0 ? 'red' : 'green', desc: max > 0 ? 'FAULT!' : 'Normal' };
    if (n.includes('errorcount') || n.includes('offcount')) return { color: max > 10 ? 'red' : (max > 0 ? 'yellow' : 'green'), desc: `Errors: ${max}` };
    if (n.includes('cyclems')) return { color: max > 40 ? 'red' : (max > 22 ? 'yellow' : 'green'), desc: `Max: ${max}ms` };
    
    // Voltage / Battery specific logic
    if (n.includes('voltage') || n.includes('batteryvoltage')) {
      if (min < 6.3) return { color: 'red', desc: `Brownout Risk! Min: ${min.toFixed(1)}V` };
      if (min < 8.5) return { color: 'yellow', desc: `Voltage Dip! Min: ${min.toFixed(1)}V` };
      return { color: 'green', desc: `Healthy: ${avg.toFixed(1)}V` };
    }

    // Vision Latency logic
    if (n.includes('latency')) {
      if (avg > 200) return { color: 'red', desc: `High Bottleneck: ${avg.toFixed(0)}ms` };
      if (avg > 80) return { color: 'orange', desc: `High Latency: ${avg.toFixed(0)}ms` };
      if (avg > 20) return { color: 'yellow', desc: `Acceptable: ${avg.toFixed(0)}ms` };
      return { color: 'green', desc: `Optimal: ${avg.toFixed(0)}ms` };
    }
    
    return { color: 'green', desc: `Range: [${min}, ${max}]` };
  };

  const categoriesWithStats = useMemo(() => {
    if (!summary || !channels.length || !logInfo) return {};
    const segments = logInfo.segments || [];
    const filteredSegments = segments.filter(s => s.type === filterMode).sort((a, b) => b.start_time - a.start_time);
    const countLimit = lookback === 'All' ? filteredSegments.length : parseInt(lookback);
    const selectedSegments = filteredSegments.slice(0, countLimit);

    const newCats: { [key: string]: { [prefix: string]: ChannelStatus[] } } = {};

    channels.forEach(c => {
      const cleanName = c.name.replace('NT:/AdvantageKit/', '/').replace('NT:/', '/');
      if (!WHITELIST_CHANNELS.includes(cleanName)) return;

      let agg: SummaryStats;
      const fullStats = summary.full;
      const segSummary = summary.segments;

      if (!fullStats && lookback === 'All' && filterMode === 'RobotRun') {
        agg = (summary as any)[c.id] || { min: 0, max: 0, avg: 0, count: 0 };
      } else if (lookback === 'All' && filterMode === 'RobotRun') {
        agg = fullStats?.[c.id] || { min: 0, max: 0, avg: 0, count: 0 };
      } else {
        const segmentStatsList = selectedSegments.map(s => segSummary?.[s.id]?.[c.id]).filter(s => s && s.count > 0);
        if (segmentStatsList.length === 0) agg = { min: 0, max: 0, avg: 0, count: 0 };
        else {
          agg = {
            min: Math.min(...segmentStatsList.map(s => s.min)),
            max: Math.max(...segmentStatsList.map(s => s.max)),
            count: segmentStatsList.reduce((acc, s) => acc + s.count, 0),
            avg: segmentStatsList.reduce((acc, s) => acc + s.avg * s.count, 0) / segmentStatsList.reduce((acc, s) => acc + s.count, 0)
          };
        }
      }

      const { color, desc } = getStatusColor(c.name, agg);
      const statusObj = { channel: c, ...agg, color, description: desc };
      const n = c.name.toLowerCase();
      let matchedSubsystem = 'Other';
      for (const [subsystem, keywords] of Object.entries(SUBSYSTEM_MAPPING)) {
        if (keywords.some(kw => n.includes(kw.toLowerCase()))) { matchedSubsystem = subsystem; break; }
      }

      const parts = cleanName.split('/');
      const prefix = parts.length > 2 ? parts.slice(0, parts.length - 1).join('/') + '/' : '/';
      if (!newCats[matchedSubsystem]) newCats[matchedSubsystem] = {};
      if (!newCats[matchedSubsystem][prefix]) newCats[matchedSubsystem][prefix] = [];
      newCats[matchedSubsystem][prefix].push(statusObj);
    });
    return newCats;
  }, [summary, channels, logInfo, filterMode, lookback]);

  const robotPartColors = useMemo(() => {
    const partColors: { [part: string]: string } = {};
    const rank = { red: 4, orange: 3, yellow: 2, green: 1, grey: 0 };
    const colorMap = { red: '#ff1744', orange: '#ff9100', yellow: '#ffea00', green: '#4caf50', grey: '#bdbdbd' };
    Object.entries(categoriesWithStats).forEach(([subsystem, groups]) => {
      let worstColor: 'red' | 'orange' | 'yellow' | 'green' | 'grey' = 'grey';
      Object.values(groups).forEach(items => items.forEach(item => { if (rank[item.color] > rank[worstColor]) worstColor = item.color; }));
      partColors[subsystem] = colorMap[worstColor];
    });
    return partColors;
  }, [categoriesWithStats]);

  if (loading) return <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10, bgcolor: '#000', height: '100vh', pt: 10 }}><CircularProgress sx={{ color: '#ff9800' }} /><Typography sx={{ mt: 2, color: '#fff' }}>Analyzing Health...</Typography></Box>;

  return (
    <Box sx={{ bgcolor: '#121212', minHeight: '100vh', pb: 10 }}>
      <AppBar position="sticky" sx={{ bgcolor: '#000000', borderBottom: '1px solid #333' }}>
        <Toolbar variant="dense" sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <img src="/logo972.jpg" alt="Logo" style={{ height: '32px', borderRadius: '4px' }} />
            <Box><Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ff9800' }}>Health Monitor</Typography><Typography variant="caption" sx={{ display: 'block', color: '#fff' }}>{logInfo?.filename}</Typography></Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'rgba(255,255,255,0.05)', px: 2, py: 0.5, borderRadius: 1, border: '1px solid #333' }}>
            <Box sx={{ borderRight: '1px solid rgba(255,255,255,0.1)', pr: 2, display: 'flex', gap: 2 }}><Typography variant="caption" sx={{ color: '#ff9800' }}>Matches: <strong>{logInfo?.segments.filter(s => s.type === 'Match').length || 0}</strong></Typography><Typography variant="caption" sx={{ color: '#ff9800' }}>Runs: <strong>{logInfo?.segments.filter(s => s.type === 'RobotRun').length || 0}</strong></Typography></Box>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#fff' }}>FILTER:</Typography>
            <Select value={filterMode} onChange={(e) => setFilterMode(e.target.value as any)} size="small" sx={{ color: '#ff9800', '.MuiOutlinedInput-notchedOutline': { border: 'none' }, fontSize: '0.8rem', fontWeight: 'bold' }}><MenuItem value="RobotRun">Robot Run</MenuItem><MenuItem value="Match">Official Match</MenuItem></Select>
            <Select value={lookback} onChange={(e) => setLookback(e.target.value)} size="small" sx={{ color: '#ff9800', '.MuiOutlinedInput-notchedOutline': { border: 'none' }, fontSize: '0.8rem', fontWeight: 'bold' }}>{['1','2','4','5','10','All'].map(v => <MenuItem key={v} value={v}>{v === 'All' ? 'All' : `Last ${v}`}</MenuItem>)}</Select>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}><Link to="/" style={{ textDecoration: 'none', display: 'flex' }}><Button size="small" sx={{ color: '#fff', minWidth: 40, '&:hover': { color: '#ff9800' } }} title="Home"><HomeIcon /></Button></Link><Button color="inherit" component={Link} to={`/dashboard/${logId}`} sx={{ color: '#fff', '&:hover': { color: '#ff9800' } }}>Plots</Button></Box>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ mt: 3 }}>
        <Box sx={{ mb: 4, bgcolor: '#000', p: 2, borderRadius: 2, border: '1px solid #333', display: 'flex', justifyContent: 'center' }}>
          <StaticRobotView height="550px" statusColors={robotPartColors} onCategoryClick={(cat) => document.getElementById(`cat-${cat.replace(/\s+/g, '-')}`)?.scrollIntoView({ behavior: 'smooth' })} />
        </Box>
        {Object.entries(categoriesWithStats).map(([catName, groups]) => (
          <Paper key={catName} id={`cat-${catName.replace(/\s+/g, '-')}`} sx={{ p: 2, mb: 3, bgcolor: '#1e1e1e', color: '#fff', border: '1px solid #333', scrollMarginTop: '70px' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: '#ff9800', borderBottom: '2px solid #ff9800', pb: 0.5, display: 'inline-block' }}>{catName}</Typography>
            {Object.entries(groups).sort((a,b) => a[0].localeCompare(b[0])).map(([prefix, items]) => (
              <Box key={prefix} sx={{ mb: 2, borderBottom: '1px solid #333', pb: 1.5 }}><Typography variant="caption" sx={{ fontWeight: 'bold', color: '#888', display: 'block', mb: 1, fontFamily: 'monospace', fontSize: '0.75rem' }}>{prefix}</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr', lg: '1fr 1fr 1fr 1fr' }, columnGap: 3, rowGap: 0.5 }}>
                  {items.sort((a, b) => a.channel.name.localeCompare(b.channel.name)).map((item) => (
                    <Box key={item.channel.id} onClick={() => navigate(`/dashboard/${logId}?select=${item.channel.id}`)} title={`${item.channel.name}\nStatus: ${item.description}\nAvg: ${item.avg.toFixed(2)}\nRange: [${item.min}, ${item.max}]`} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.4, px: 1, borderRadius: 1, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255, 152, 0, 0.15)' } }}><FastLed status={item} onClick={() => {}} /><Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#ddd', fontWeight: item.color === 'red' ? 'bold' : 'normal' }}>{item.channel.name.split('/').pop()}</Typography></Box>
                  ))}
                </Box>
              </Box>
            ))}
          </Paper>
        ))}
      </Container>
      <Zoom in={trigger}><Fab onClick={scrollToTop} size="small" sx={{ position: 'fixed', bottom: 24, right: 24, bgcolor: '#ff9800', color: '#000', '&:hover': { bgcolor: '#e68a00' } }}><KeyboardArrowUpIcon /></Fab></Zoom>
    </Box>
  );
};

export default StatusOverviewPage;
