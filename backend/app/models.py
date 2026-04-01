from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base
import datetime

class LogFile(Base):
    __tablename__ = "log_files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, unique=True, index=True)
    upload_date = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="Ready") # 'Processing' or 'Ready'
    progress = Column(Integer, default=0) # 0 to 100
    description = Column(String, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)

    channels = relationship("Channel", back_populates="log_file", cascade="all, delete-orphan")
    segments = relationship("Segment", back_populates="log_file", cascade="all, delete-orphan")

class Segment(Base):
    __tablename__ = "segments"
    id = Column(Integer, primary_key=True, index=True)
    log_file_id = Column(Integer, ForeignKey("log_files.id"))
    name = Column(String)
    type = Column(String) # "Match" or "RobotRun"
    start_time = Column(Integer)
    end_time = Column(Integer)

    log_file = relationship("LogFile", back_populates="segments")

class Channel(Base):
    __tablename__ = "channels"

    id = Column(Integer, primary_key=True, index=True)
    log_file_id = Column(Integer, ForeignKey("log_files.id"))
    entry_id = Column(Integer, index=True)
    name = Column(String, index=True)
    type = Column(String)
    dashboard_visibility = Column(String, default="Display") # 'Display' or 'Hide'

    log_file = relationship("LogFile", back_populates="channels")
