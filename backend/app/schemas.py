from pydantic import BaseModel
import datetime
from typing import Optional, Union, List, Any

# --- Schemas for Database Models ---

class ChannelBase(BaseModel):
    entry_id: int
    name: str
    type: str
    dashboard_visibility: str = "Display"

class Channel(ChannelBase):
    id: int
    log_file_id: int

    class Config:
        from_attributes = True

class LogFileBase(BaseModel):
    filename: str

class Segment(BaseModel):
    id: int
    name: str
    type: str # "Match" or "RobotRun"
    start_time: int
    end_time: int

class LogFile(LogFileBase):
    id: int
    upload_date: datetime.datetime
    status: str = "Ready"
    progress: int = 0
    description: Optional[str] = None
    file_size_bytes: Optional[int] = None
    channels: List[Channel] = []
    segments: List[Segment] = [] # New: list of pre-detected segments

    class Config:
        from_attributes = True

class LogUpdate(BaseModel):
    description: Optional[str] = None
    filename: Optional[str] = None

# --- Schemas for API Responses ---

class TelemetryDataPoint(BaseModel):
    timestamp: int
    value: Any
