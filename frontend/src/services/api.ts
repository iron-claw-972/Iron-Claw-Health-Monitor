
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 600000, 
});

export interface Channel {
  id: number;
  entry_id: number;
  name: string;
  type: string;
  log_file_id: number;
  dashboard_visibility: string;
}

export interface Segment {
  id: number;
  name: string;
  type: string; // "Match" or "RobotRun"
  start_time: number;
  end_time: number;
}

export interface LogFile {
  id: number;
  filename: string;
  upload_date: string;
  status: string;
  progress: number;
  description: string;
  file_size_bytes: number;
  channels: Channel[];
  segments: Segment[];
}

export interface TelemetryDataPoint {
  timestamp: number;
  value: any;
}

export const getLogFiles = () => api.get<LogFile[]>('/logs');
export const getLogChannels = (logId: number) => api.get<Channel[]>(`/logs/${logId}/channels`);
export const getTelemetryData = (logId: number, channelId: number, window?: string) => 
  api.get<TelemetryDataPoint[]>(`/logs/${logId}/telemetry/${channelId}${window ? `?window=${window}` : ''}`);

export interface SummaryStats {
  min: number;
  max: number;
  avg: number;
  count: number;
}

export interface SummaryData {
  full: { [key: string]: SummaryStats };
  segments: { [key: string]: { [key: string]: SummaryStats } };
}

export const getLogSummary = (logId: number) => 
  api.get<SummaryData>(`/logs/${logId}/summary`);

export const getParsingStats = (logId: number) =>
  api.get<any>(`/logs/${logId}/parsing-stats`);

export const deleteLog = (logId: number) => api.delete(`/logs/${logId}`);
export const updateLog = (logId: number, data: { description?: string, filename?: string }) => 
  api.patch<LogFile>(`/logs/${logId}/update`, data);

export const reparseLog = (logId: number) => api.post(`/logs/${logId}/reparse`);
export const clearDebugLogs = () => api.delete('/debug/clear-logs');

export default api;
