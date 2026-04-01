import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Input, List, ListItem, ListItemText, Alert, ListItemButton, AppBar, Toolbar, Container, Paper, LinearProgress, TextField, IconButton, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getLogFiles, reparseLog, deleteLog, updateLog, clearDebugLogs, getParsingStats } from '../services/api';
import type { LogFile } from '../services/api';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import BugReportIcon from '@mui/icons-material/BugReport';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import BarChartIcon from '@mui/icons-material/BarChart';
import axios from 'axios';

const LogUploadPage: React.FC = () => {
  const [uploadedLogs, setUploadedLogs] = useState<LogFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [selectedStats, setSelectedStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const navigate = useNavigate();

  const fetchLogs = async () => {
    try {
      const response = await getLogFiles();
      setUploadedLogs(response.data);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    setUploadMessage('Uploading...');
    setUploadError('');
    try {
      await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/logs/upload`, formData);
      setUploadMessage('Upload successful! Processing started.');
      setSelectedFile(null);
      fetchLogs();
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Upload failed');
      setUploadMessage('');
    }
  };

  const handleReparse = async (id: number) => {
    try {
      await reparseLog(id);
      fetchLogs();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this log and all its data?')) return;
    try {
      await deleteLog(id);
      fetchLogs();
    } catch (err) { console.error(err); }
  };

  const handleUpdateDescription = async (id: number) => {
    try {
      await updateLog(id, { description: editValue });
      setEditingId(null);
      fetchLogs();
    } catch (err) { console.error(err); }
  };

  const handleViewStats = async (id: number) => {
    setLoadingStats(true);
    setSelectedStats(null);
    setStatsDialogOpen(true);
    try {
      const res = await getParsingStats(id);
      setSelectedStats(res.data);
    } catch (err) { console.error(err); } finally { setLoadingStats(false); }
  };

  const handleDownloadDebug = () => {
    window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/debug/parsing-errors`, '_blank');
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Clear all debug and system logs?')) return;
    try {
      await clearDebugLogs();
      alert('Logs cleared');
    } catch (err) { console.error(err); }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box sx={{ bgcolor: '#121212', minHeight: '100vh', pb: 10 }}>
      <AppBar position="sticky" sx={{ bgcolor: '#000000', borderBottom: '1px solid #333' }}>
        <Toolbar variant="dense">
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: '#ff9800', fontWeight: 'bold' }}>
            IronClaw Robot Health Monitor
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button color="inherit" startIcon={<ClearAllIcon />} onClick={handleClearLogs} sx={{ color: '#fff', '&:hover': { color: '#ff9800' } }}>
              Clear Logs
            </Button>
            <Button color="inherit" startIcon={<BugReportIcon />} onClick={handleDownloadDebug} sx={{ color: '#fff', '&:hover': { color: '#ff9800' } }}>
              Debug Log
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3, mb: 4, bgcolor: '#1e1e1e', color: '#fff', border: '1px solid #333' }}>
          <Typography variant="h5" gutterBottom sx={{ color: '#ff9800' }}>Upload New Log</Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Input type="file" onChange={(e: any) => setSelectedFile(e.target.files[0])} fullWidth sx={{ color: '#fff' }} />
            <Button variant="contained" onClick={handleFileUpload} disabled={!selectedFile} sx={{ bgcolor: '#ff9800', color: '#000', '&:hover': { bgcolor: '#e68a00' }, fontWeight: 'bold' }}>Upload</Button>
          </Box>
          {uploadMessage && <Alert severity="info" sx={{ mt: 2, bgcolor: 'rgba(33, 150, 243, 0.1)', color: '#90caf9' }}>{uploadMessage}</Alert>}
          {uploadError && <Alert severity="error" sx={{ mt: 2, bgcolor: 'rgba(244, 67, 54, 0.1)', color: '#ef9a9a' }}>{uploadError}</Alert>}
        </Paper>

        <Typography variant="h5" gutterBottom sx={{ color: '#ff9800' }}>Log Management</Typography>
        <Paper sx={{ bgcolor: '#1e1e1e', color: '#fff', border: '1px solid #333' }}>
          <List>
            {uploadedLogs.map((log) => (
              <ListItem key={log.id} divider sx={{ flexDirection: 'column', alignItems: 'stretch', borderColor: '#333' }}>
                <Box sx={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <ListItemButton onClick={() => navigate(`/status/${log.id}`)} disabled={log.status !== 'Ready'}>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ color: '#fff' }}>{log.filename}</Typography>
                          <Typography variant="caption" sx={{ color: '#000', bgcolor: '#ff9800', px: 0.8, py: 0.2, borderRadius: 1, fontWeight: 'bold' }}>
                            {formatSize(log.file_size_bytes)}
                          </Typography>
                        </Box>
                      } 
                      secondary={`${new Date(log.upload_date).toLocaleString()} • Status: ${log.status}`} 
                      secondaryTypographyProps={{ sx: { color: '#888' } }}
                    />
                  </ListItemButton>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton onClick={() => handleViewStats(log.id)} sx={{ color: '#2196f3' }} title="Parsing Stats"><BarChartIcon /></IconButton>
                    <IconButton onClick={() => handleReparse(log.id)} sx={{ color: '#ff9800' }} title="Reparse Log"><RefreshIcon /></IconButton>
                    <IconButton onClick={() => handleDelete(log.id)} color="error" title="Delete"><DeleteIcon /></IconButton>
                  </Box>
                </Box>
                
                {log.status === 'Processing' && (
                  <Box sx={{ px: 2, pb: 2 }}>
                    <Typography variant="caption" sx={{ color: '#ff9800' }}>Analyzing: {log.progress}%</Typography>
                    <LinearProgress variant="determinate" value={log.progress} sx={{ bgcolor: '#333', '& .MuiLinearProgress-bar': { bgcolor: '#ff9800' } }} />
                  </Box>
                )}

                <Box sx={{ px: 2, pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  {editingId === log.id ? (
                    <>
                      <TextField size="small" fullWidth value={editValue} onChange={(e) => setEditValue(e.target.value)} sx={{ bgcolor: '#000', input: { color: '#fff' } }} />
                      <IconButton onClick={() => handleUpdateDescription(log.id)} sx={{ color: '#ff9800' }}><CheckIcon /></IconButton>
                    </>
                  ) : (
                    <>
                      <Typography variant="body2" sx={{ fontStyle: 'italic', flexGrow: 1, color: '#aaa' }}>
                        {log.description || "No description provided."}
                      </Typography>
                      <IconButton size="small" onClick={() => { setEditingId(log.id); setEditValue(log.description || ''); }} sx={{ color: '#888' }}><EditIcon fontSize="small" /></IconButton>
                    </>
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
        </Paper>
      </Container>

      {/* Parsing Stats Dialog */}
      <Dialog open={statsDialogOpen} onClose={() => setStatsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#000', color: '#ff9800', fontWeight: 'bold' }}>Log Parsing Statistics</DialogTitle>
        <DialogContent sx={{ bgcolor: '#121212', color: '#fff', p: 0 }}>
          {loadingStats ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress sx={{ color: '#ff9800' }} /></Box>
          ) : (selectedStats && selectedStats.total_records !== undefined) ? (
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ color: '#ff9800' }}>Total Records Processed: <strong>{selectedStats.total_records.toLocaleString()}</strong></Typography>
              <TableContainer component={Paper} sx={{ bgcolor: '#1e1e1e', maxHeight: '70vh' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ bgcolor: '#000', color: '#ff9800', width: '80%' }}>Channel Name</TableCell>
                      <TableCell align="right" sx={{ bgcolor: '#000', color: '#ff9800', width: '20%' }}>Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(selectedStats.channel_counts || {})
                      .sort((a: any, b: any) => b[1] - a[1])
                      .map(([name, count]: any) => (
                        <TableRow key={name} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell sx={{ color: count === 0 ? '#ff1744' : '#ddd', fontSize: '0.75rem', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{name}</TableCell>
                          <TableCell align="right" sx={{ color: count === 0 ? '#ff1744' : '#fff', fontWeight: count === 0 ? 'bold' : 'normal' }}>
                            {count === 0 ? 'MISSING' : count.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography>{selectedStats?.message || 'No stats found for this log. Try reparsing.'}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#000' }}>
          <Button onClick={() => setStatsDialogOpen(false)} sx={{ color: '#ff9800' }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LogUploadPage;
