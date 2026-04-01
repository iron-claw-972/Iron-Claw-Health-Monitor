import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, List, ListItem, ListItemText, Paper, CircularProgress, Checkbox, ListItemIcon, ListItemButton, AppBar, Toolbar, Button, Container, Select, MenuItem, Fab, Zoom, useScrollTrigger, TextField, InputAdornment, Accordion, AccordionSummary, AccordionDetails, Slider } from '@mui/material';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { getLogChannels, getTelemetryData, getLogSummary, getLogFiles } from '../services/api';
import type { Channel, TelemetryDataPoint, LogFile, SummaryData, SummaryStats } from '../services/api';
import { Chart as ChartJS, LinearScale, CategoryScale, PointElement, LineElement, Title, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import HomeIcon from '@mui/icons-material/Home';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';

ChartJS.register(LinearScale, CategoryScale, PointElement, LineElement, Title, ChartTooltip, Legend);

// STRICT WHITELIST
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

interface TreeNode {
  name: string;
  fullName: string;
  channel?: Channel;
  children: { [key: string]: TreeNode };
}

const DashboardPage: React.FC = () => {
  const { logId } = useParams<{ logId: string }>();
  const [searchParams] = useSearchParams();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<number[]>([]);
  const [telemetryData, setTelemetryData] = useState<{ [key: number]: TelemetryDataPoint[] }>({});
  const [loadingChannels, setLoadingChannels] = useState<{ [key: number]: boolean }>({});
  const [logInfo, setLogInfo] = useState<LogFile | null>(null);
  const [, setSummary] = useState<SummaryData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 100]);

  const [filterMode, setFilterMode] = useState<'RobotRun' | 'Match'>('RobotRun');
  const [lookback, setLookback] = useState<string>('All');

  const trigger = useScrollTrigger({ disableHysteresis: true, threshold: 100 });
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const getStatusColor = (name: string, stats: SummaryStats): { color: 'green' | 'yellow' | 'orange' | 'red' | 'grey' } => {
    if (stats.count === 0) return { color: 'grey' };
    const { min, max, avg } = stats;
    const n = name.toLowerCase();
    
    if (n.includes('brownedout') || n.includes('fault') || n.includes('emergencystop')) return { color: max > 0 ? 'red' : 'green' };
    if (n.includes('errorcount') || n.includes('offcount')) return { color: max > 10 ? 'red' : (max > 0 ? 'yellow' : 'green') };
    if (n.includes('cyclems')) return { color: max > 40 ? 'red' : (max > 22 ? 'yellow' : 'green') };
    
    // Voltage logic
    if (n.includes('voltage') || n.includes('batteryvoltage')) {
      if (min < 6.3) return { color: 'red' };
      if (min < 8.5) return { color: 'yellow' };
      return { color: 'green' };
    }

    // Vision logic
    if (n.includes('latency')) {
      if (avg > 200) return { color: 'red' };
      if (avg > 80) return { color: 'orange' };
      if (avg > 20) return { color: 'yellow' };
      return { color: 'green' };
    }
    
    return { color: 'green' };
  };

  const fetchDataForChannel = async (channelId: number) => {
    if (telemetryData[channelId]) return;
    setLoadingChannels(prev => ({ ...prev, [channelId]: true }));
    try {
      const response = await getTelemetryData(parseInt(logId!), channelId);
      setTelemetryData(prev => ({ ...prev, [channelId]: response.data }));
    } catch (err) { console.error(err); } finally { setLoadingChannels(prev => ({ ...prev, [channelId]: false })); }
  };

  useEffect(() => {
    if (!logId) return;
    const fetchInitialData = async () => {
      try {
        const [chRes, sumRes, logsRes] = await Promise.all([
          getLogChannels(parseInt(logId)), 
          getLogSummary(parseInt(logId)), 
          getLogFiles()
        ]);
        setChannels(chRes.data);
        setSummary(sumRes.data);
        const currentLog = logsRes.data.find(l => l.id === parseInt(logId));
        if (currentLog) setLogInfo(currentLog);

        const preSelect = searchParams.get('select');
        const sums: any = sumRes.data;
        const initialSelected: number[] = [];

        if (preSelect) {
          // IF SPECIFIC ATTRIBUTE CLICKED: Only select that one
          initialSelected.push(parseInt(preSelect));
        } else {
          // IF GENERAL "PLOTS" BUTTON CLICKED: Select ALL bad attributes
          chRes.data.forEach(c => {
            const cleanName = c.name.replace('NT:/AdvantageKit/', '/').replace('NT:/', '/');
            if (!WHITELIST_CHANNELS.includes(cleanName)) return;
            const s = (sums.full ? sums.full[c.id] : sums[c.id]) || { count: 0, min: 0, max: 0, avg: 0 };
            const status = getStatusColor(c.name, s).color;
            if (['red', 'yellow', 'orange'].includes(status)) {
              initialSelected.push(c.id);
            }
          });
        }
        
        setSelectedChannels(initialSelected);
        initialSelected.forEach(id => fetchDataForChannel(id));
      } catch (err) { console.error(err); }
    };
    fetchInitialData();
  }, [logId, searchParams]);

  const channelTree = useMemo(() => {
    const root: TreeNode = { name: 'Root', fullName: '', children: {} };
    channels
      .filter(c => {
        const cleanName = c.name.replace('NT:/AdvantageKit/', '/').replace('NT:/', '/');
        return WHITELIST_CHANNELS.includes(cleanName);
      })
      .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .forEach(c => {
        const cleanName = c.name.replace('NT:/AdvantageKit/', '/').replace('NT:/', '/');
        const parts = (cleanName.startsWith('/') ? cleanName.substring(1) : cleanName).split('/').filter(p => p);
        
        let current = root;
        let path = '';
        parts.forEach((part, idx) => {
          path += '/' + part;
          if (!current.children[part]) {
            current.children[part] = { name: part, fullName: path, children: {} };
          }
          current = current.children[part];
          if (idx === parts.length - 1) {
            current.channel = c;
          }
        });
      });
    return root;
  }, [channels, searchTerm]);

  const selectedSegments = useMemo(() => {
    if (!logInfo) return [];
    const segments = logInfo.segments || [];
    const filtered = segments.filter(s => s.type === filterMode).sort((a, b) => b.start_time - a.start_time);
    const countLimit = lookback === 'All' ? filtered.length : parseInt(lookback);
    return filtered.slice(0, countLimit);
  }, [logInfo, filterMode, lookback]);

  const logTimeBounds = useMemo(() => {
    if (selectedSegments.length === 0) return { min: 0, max: 100 };
    const min = Math.min(...selectedChannels.flatMap(id => telemetryData[id] || []).map(d => d.timestamp / 1000000));
    const max = Math.max(...selectedChannels.flatMap(id => telemetryData[id] || []).map(d => d.timestamp / 1000000));
    
    if (!isFinite(min)) {
        const sMin = Math.min(...selectedSegments.map(s => s.start_time / 1000000));
        const sMax = Math.max(...selectedSegments.map(s => s.end_time / 1000000));
        return { min: isFinite(sMin) ? sMin : 0, max: isFinite(sMax) ? sMax : 100 };
    }
    return { min, max };
  }, [selectedSegments, selectedChannels, telemetryData]);

  useEffect(() => {
    if (isFinite(logTimeBounds.min) && isFinite(logTimeBounds.max)) {
        setTimeRange([logTimeBounds.min, logTimeBounds.max]);
    }
  }, [logTimeBounds]);

  const chartData = useMemo(() => {
    const activeDatasets = selectedChannels.filter(id => telemetryData[id]).map((channelId, index) => {
      const channel = channels.find(c => c.id === channelId);
      let data = telemetryData[channelId] || [];
      const minTS = timeRange[0] * 1000000;
      const maxTS = timeRange[1] * 1000000;
      data = data.filter(d => d.timestamp >= minTS && d.timestamp <= maxTS);

      const colors = ['#ff9800', '#2196f3', '#4caf50', '#f44336', '#9c27b0', '#00bcd4', '#e91e63'];
      const maxVal = data.length > 0 ? Math.max(...data.map(d => d.value)) : 0;
      return {
        label: (channel?.name || `Channel ${channelId}`).replace('NT:/AdvantageKit/', '/').replace('NT:/', '/'),
        data: data.map(d => ({ x: d.timestamp / 1000000, y: d.value })),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '22',
        tension: 0, pointRadius: 0, borderWidth: 2, spanGaps: false, yAxisID: maxVal > 30 ? 'y1' : 'y',
      };
    });

    const hasVoltage = selectedChannels.some(id => {
      const c = channels.find(ch => ch.id === id);
      const name = c?.name.toLowerCase() || '';
      return name.includes('voltage') || name.includes('battery');
    });

    const hasLatency = selectedChannels.some(id => {
      const c = channels.find(ch => ch.id === id);
      return c?.name.toLowerCase().includes('latency');
    });

    if (hasVoltage && activeDatasets.length > 0) {
      activeDatasets.push({ label: 'Warning (8.5V)', data: [{ x: timeRange[0], y: 8.5 }, { x: timeRange[1], y: 8.5 }], borderColor: '#ffea00', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, yAxisID: 'y', backgroundColor: 'transparent', tension: 0, spanGaps: true } as any);
      activeDatasets.push({ label: 'Brownout (6.3V)', data: [{ x: timeRange[0], y: 6.3 }, { x: timeRange[1], y: 6.3 }], borderColor: '#ff1744', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, yAxisID: 'y', backgroundColor: 'transparent', tension: 0, spanGaps: true } as any);
    }

    if (hasLatency && activeDatasets.length > 0) {
      activeDatasets.push({ label: 'Poor (>200ms)', data: [{ x: timeRange[0], y: 200 }, { x: timeRange[1], y: 200 }], borderColor: '#ff1744', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, yAxisID: 'y', backgroundColor: 'transparent', tension: 0, spanGaps: true } as any);
      activeDatasets.push({ label: 'High (>80ms)', data: [{ x: timeRange[0], y: 80 }, { x: timeRange[1], y: 80 }], borderColor: '#ff9100', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, yAxisID: 'y', backgroundColor: 'transparent', tension: 0, spanGaps: true } as any);
      activeDatasets.push({ label: 'Acceptable (>20ms)', data: [{ x: timeRange[0], y: 20 }, { x: timeRange[1], y: 20 }], borderColor: '#ffea00', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, yAxisID: 'y', backgroundColor: 'transparent', tension: 0, spanGaps: true } as any);
    }

    return { datasets: activeDatasets };
  }, [selectedChannels, telemetryData, channels, timeRange]);

  const renderTree = (node: TreeNode, depth = 0): React.ReactNode => {
    const sortedChildren = Object.values(node.children).sort((a,b) => a.name.localeCompare(b.name));
    if (node.channel) {
      const c = node.channel;
      return (
        <ListItem key={c.id} disablePadding sx={{ ml: depth * 1.5 }}>
          <ListItemButton dense onClick={() => { setSelectedChannels(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]); fetchDataForChannel(c.id); }} sx={{ py: 0.2 }}>
            <ListItemIcon sx={{ minWidth: 28 }}><Checkbox checked={selectedChannels.includes(c.id)} size="small" sx={{ color: '#ff9800', '&.Mui-checked': { color: '#ff9800' }, p: 0.5 }} /></ListItemIcon>
            <ListItemText primary={node.name} primaryTypographyProps={{ sx: { fontSize: '0.7rem', fontFamily: 'monospace', color: '#ddd' } }} />
            {loadingChannels[c.id] && <CircularProgress size={10} sx={{ color: '#ff9800', ml: 1 }} />}
          </ListItemButton>
        </ListItem>
      );
    }
    if (depth === 0) return sortedChildren.map(child => renderTree(child, depth + 1));
    const isExpanded = depth === 1 || searchTerm.length > 0;
    return (
      <Accordion key={node.fullName} disableGutters elevation={0} defaultExpanded={isExpanded} sx={{ bgcolor: 'transparent', color: '#fff', '&:before': { display: 'none' }, ml: depth > 1 ? 1.5 : 0 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#666', fontSize: '0.9rem' }} />} sx={{ minHeight: 28, height: 32, px: 1, '& .MuiAccordionSummary-content': { my: 0, alignItems: 'center', gap: 1 } }}>
          <FolderIcon sx={{ fontSize: '0.8rem', color: '#ff9800' }} />
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#aaa' }}>{node.name}</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0, borderLeft: '1px solid #333', ml: 1.5 }}><List dense disablePadding>{sortedChildren.map(child => renderTree(child, depth + 1))}</List></AccordionDetails>
      </Accordion>
    );
  };

  return (
    <Box sx={{ bgcolor: '#121212', minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" sx={{ bgcolor: '#000000', borderBottom: '1px solid #333' }}>
        <Toolbar variant="dense" sx={{ justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <img src="/logo972.jpg" alt="Logo" style={{ height: '32px', borderRadius: '4px' }} />
            <Box><Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ff9800' }}>Monitor Plots</Typography></Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'rgba(255,255,255,0.05)', px: 2, py: 0.5, borderRadius: 1, border: '1px solid #333' }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#fff' }}>FILTER:</Typography>
            <Select value={filterMode} onChange={(e) => setFilterMode(e.target.value as any)} size="small" sx={{ color: '#ff9800', '.MuiOutlinedInput-notchedOutline': { border: 'none' }, fontSize: '0.8rem', fontWeight: 'bold' }}><MenuItem value="RobotRun">Robot Run</MenuItem><MenuItem value="Match">Official Match</MenuItem></Select>
            <Select value={lookback} onChange={(e) => setLookback(e.target.value)} size="small" sx={{ color: '#ff9800', '.MuiOutlinedInput-notchedOutline': { border: 'none' }, fontSize: '0.8rem', fontWeight: 'bold' }}>{['1','2','4','5','10','All'].map(v => <MenuItem key={v} value={v}>{v === 'All' ? 'All' : `Last ${v}`}</MenuItem>)}</Select>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Link to="/" style={{ textDecoration: 'none', display: 'flex' }}><Button size="small" sx={{ color: '#fff', minWidth: 40, '&:hover': { color: '#ff9800' } }} title="Home"><HomeIcon /></Button></Link>
            <Link to={`/status/${logId}`} style={{ textDecoration: 'none' }}><Button sx={{ color: '#fff', '&:hover': { color: '#ff9800' } }}>Status Map</Button></Link>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Box sx={{ display: 'flex', flexGrow: 1, width: '100%', mt: 1, px: 1, gap: 1 }}>
        {/* Sidebar */}
        <Paper sx={{ width: '250px', minWidth: '250px', height: '93vh', display: 'flex', flexDirection: 'column', bgcolor: '#1e1e1e', color: '#fff', border: '1px solid #333' }}>
          <Box sx={{ p: 1 }}>
            <TextField 
              size="small" fullWidth placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ bgcolor: '#000', borderRadius: 1, input: { color: '#fff', fontSize: '0.75rem' } }}
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: '#666', fontSize: '1rem' }} /></InputAdornment>) }}
            />
          </Box>
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>{renderTree(channelTree)}</Box>
          <Box sx={{ p: 1, borderTop: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: '#666', fontSize: '0.6rem' }}>{selectedChannels.length} sel</Typography>
            <Button size="small" onClick={() => setSelectedChannels([])} sx={{ color: '#ff9800', fontSize: '0.6rem', minWidth: 0, p: 0 }}>Clear</Button>
          </Box>
        </Paper>

        {/* Main Chart Area */}
        <Paper sx={{ flexGrow: 1, height: '93vh', bgcolor: '#1e1e1e', border: '1px solid #333', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ flexGrow: 1, minHeight: 0, p: 1 }}>
            {selectedChannels.length > 0 ? (
              <Line 
                data={chartData} 
                options={{ 
                  responsive: true, maintainAspectRatio: false, animation: false as any, 
                  scales: { 
                    x: { type: 'linear', grid: { color: '#222' }, ticks: { color: '#888', font: { size: 10 } }, title: { display: true, text: 'Time (s)', color: '#ff9800', font: { size: 11, weight: 'bold' } } }, 
                    y: { grid: { color: '#222' }, ticks: { color: '#888' } }, 
                    y1: { position: 'right', display: chartData.datasets.some(d => d.yAxisID === 'y1'), grid: { drawOnChartArea: false }, ticks: { color: '#888' } } 
                }, 
                plugins: { 
                  legend: { position: 'top', labels: { color: '#fff', boxWidth: 10, font: { size: 9 }, padding: 5 } }
                } 
              }} 
            />
          ) : <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Typography sx={{ color: '#555' }}>Search and select sensors to visualize</Typography></Box>}
          </Box>
          
          {selectedChannels.length > 0 && (
            <Box sx={{ px: 4, pt: 1, pb: 0.5, borderTop: '1px solid #333' }}>
              <Typography variant="caption" sx={{ color: '#888', mb: 0.5, display: 'block', fontSize: '0.65rem' }}>
                Zoom: {timeRange[0].toFixed(1)}s - {timeRange[1].toFixed(1)}s
              </Typography>
              <Slider
                value={timeRange}
                onChange={(_e, newValue: any) => setTimeRange(newValue)}
                valueLabelDisplay="auto"
                min={logTimeBounds.min}
                max={logTimeBounds.max}
                step={0.1}
                size="small"
                sx={{ color: '#ff9800', py: 1, '& .MuiSlider-valueLabel': { bgcolor: '#ff9800', color: '#000' } }}
              />
            </Box>
          )}
        </Paper>
      </Box>
      <Zoom in={trigger}><Fab onClick={scrollToTop} size="small" sx={{ position: 'fixed', bottom: 24, right: 24, bgcolor: '#ff9800', color: '#000', '&:hover': { bgcolor: '#e68a00' } }}><KeyboardArrowUpIcon /></Fab></Zoom>
    </Box>
  );
};

export default DashboardPage;
