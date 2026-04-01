from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, status, Body, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session, joinedload
import os
import shutil
import datetime
import json
import logging
import time
from typing import List, Optional

from . import models, schemas, log_parser
from .database import engine, get_db, SessionLocal

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

models.Base.metadata.create_all(bind=engine)
app = FastAPI()
UPLOADS_DIR = os.path.abspath("uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

origins = [
    "http://localhost:3000",
    "http://localhost:5173", 
    "http://127.0.0.1:5173",
]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

HIDDEN_CHANNELS = [
    "/Timestamp",
    "/SystemStats/5vRail/Active",
    "/SystemStats/3v3Rail/Current",
    "/RealOutputs/Logger/RadioLogMS",
    "/SystemStats/6vRail/Active",
    "/SystemStats/5vRail/Current",
    "/SystemStats/6vRail/Current",
    "/SystemStats/BatteryCurrent",
    "/PowerDistribution/TotalEnergy",
    "/PowerDistribution/TotalCurrent",
    "/SystemStats/BrownoutVoltage",
    "/SystemStats/3v3Rail/Active"
]

def trigger_reparse_sync(log_file_id: int):
    logger.info(f"Starting reparse for log_id: {log_file_id}")
    time.sleep(0.5)
    db = SessionLocal()
    try:
        log_file = db.query(models.LogFile).get(log_file_id)
        if not log_file: 
            logger.error(f"Log file {log_file_id} not found in DB")
            return
            
        file_path = os.path.join(UPLOADS_DIR, log_file.filename)
        logger.info(f"Processing file: {file_path}")
        if not os.path.exists(file_path):
            logger.error(f"File not found on disk: {file_path}")
            log_file.status = "Error (File missing)"
            db.commit()
            return
        
        log_file.status = "Processing"
        log_file.progress = 1 # Set to 1 to show it started
        db.commit()
        
        logger.info("Clearing existing channels...")
        db.query(models.Channel).filter(models.Channel.log_file_id == log_file.id).delete()
        db.commit()
        
        total_records_est = max(1, log_file.file_size_bytes // 24)
        logger.info(f"Estimated records: {total_records_est}")
        
        def on_progress(current_count):
            p = min(92, int((current_count / total_records_est) * 100))
            if current_count % 100000 == 0:
                logger.info(f"Progress for log {log_file_id}: {current_count} records ({p}%)")
                try:
                    db.query(models.LogFile).filter(models.LogFile.id == log_file_id).update({"progress": p})
                    db.commit()
                except Exception as e: 
                    logger.error(f"Progress update error: {e}")

        logger.info("Calling log_parser...")
        result = log_parser.parse_and_extract_all(file_path, progress_callback=on_progress)
        logger.info(f"Parsing complete. Found {len(result['channels'])} channels and {len(result['segments'])} segments.")
        
        log_file.progress = 93
        db.commit()

        logger.info("Clearing existing channels and segments...")
        db.query(models.Channel).filter(models.Channel.log_file_id == log_file.id).delete()
        db.query(models.Segment).filter(models.Segment.log_file_id == log_file.id).delete()
        db.commit()

        for seg_data in result['segments']:
            db.add(models.Segment(
                log_file_id=log_file.id,
                name=seg_data['name'],
                type=seg_data['type'],
                start_time=seg_data['start_time'],
                end_time=seg_data['end_time']
            ))
        db.commit()

        for ch_data in result['channels']:
            visibility = "Hide" if ch_data['name'] in HIDDEN_CHANNELS else "Display"
            db.add(models.Channel(
                log_file_id=log_file.id, 
                entry_id=ch_data['entry_id'], 
                name=ch_data['name'], 
                type=ch_data['type'],
                dashboard_visibility=visibility
            ))
        db.commit()
        logger.info("Channels saved to DB.")
        
        db_channels = db.query(models.Channel).filter(models.Channel.log_file_id == log_file.id).all()
        channel_id_map = {ch.entry_id: ch.id for ch in db_channels}
        
        summary_path = os.path.join(UPLOADS_DIR, f"{log_file.filename}.summary.json")
        with open(summary_path, "w") as f: json.dump(result['summary'], f)
        
        stats_path = os.path.join(UPLOADS_DIR, f"{log_file.filename}.stats.json")
        with open(stats_path, "w") as f: json.dump(result['parsing_stats'], f)
            
        data_items = list(result['data'].items())
        total_items = len(data_items)
        for idx, (entry_id, points) in enumerate(data_items):
            p = 94 + int((idx / max(1, total_items)) * 5)
            if p != log_file.progress:
                log_file.progress = p
                db.commit()

            ch_id = channel_id_map.get(entry_id)
            if ch_id:
                cache_path = os.path.join(UPLOADS_DIR, f"log_{log_file.id}_ch_{ch_id}_v2.json")
                json_data = [{"timestamp": p.timestamp, "value": p.value} for p in points]
                with open(cache_path, "w") as f: json.dump(json_data, f)

        log_file.status = "Ready"
        log_file.progress = 100
        db.commit()
    except Exception as e:
        logger.error(f"Reparse error: {e}")
        err_db = SessionLocal()
        lf = err_db.query(models.LogFile).get(log_file_id)
        if lf: 
            lf.status = f"Error: {str(e)[:50]}"
            err_db.commit()
        err_db.close()
    finally: db.close()

@app.post("/api/logs/upload", response_model=schemas.LogFile)
async def upload_log_file(background_tasks: BackgroundTasks, file: UploadFile = File(...), db: Session = Depends(get_db)):
    db_file = db.query(models.LogFile).filter(models.LogFile.filename == file.filename).first()
    file_path = os.path.join(UPLOADS_DIR, file.filename)
    
    with open(file_path, "wb") as buffer: 
        shutil.copyfileobj(file.file, buffer)
    file_size = os.path.getsize(file_path)
    
    if db_file:
        db_file.status = "Processing"
        db_file.file_size_bytes = file_size
        db.commit()
        background_tasks.add_task(trigger_reparse_sync, db_file.id)
        return db_file
        
    db_log_file = models.LogFile(filename=file.filename, status="Processing", file_size_bytes=file_size)
    db.add(db_log_file)
    db.commit()
    db.refresh(db_log_file)
    background_tasks.add_task(trigger_reparse_sync, db_log_file.id)
    return db_log_file

@app.get("/api/logs", response_model=List[schemas.LogFile])
def get_log_files(db: Session = Depends(get_db)):
    return db.query(models.LogFile).options(joinedload(models.LogFile.channels), joinedload(models.LogFile.segments)).order_by(models.LogFile.upload_date.desc()).all()

@app.patch("/api/logs/{log_id}/update", response_model=schemas.LogFile)
def update_log(log_id: int, update_data: schemas.LogUpdate, db: Session = Depends(get_db)):
    log = db.query(models.LogFile).get(log_id)
    if not log: raise HTTPException(status_code=404)
    if update_data.description is not None: log.description = update_data.description
    if update_data.filename is not None and update_data.filename != log.filename:
        filename = update_data.filename if update_data.filename.endswith(".wpilog") else update_data.filename + ".wpilog"
        old_path = os.path.join(UPLOADS_DIR, log.filename)
        new_path = os.path.join(UPLOADS_DIR, filename)
        if os.path.exists(old_path): os.rename(old_path, new_path)
        log.filename = filename
    db.commit()
    db.refresh(log)
    return log

@app.delete("/api/logs/{log_id}")
def delete_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(models.LogFile).get(log_id)
    if not log: return {"message": "Log not found"}
    path = os.path.join(UPLOADS_DIR, log.filename)
    if os.path.exists(path): os.remove(path)
    cache = os.path.join(UPLOADS_DIR, f"{log.filename}.summary.json")
    if os.path.exists(cache): os.remove(cache)
    prefix = f"log_{log_id}_ch_"
    for f in os.listdir(UPLOADS_DIR):
        if f.startswith(prefix) and f.endswith(".json"): os.remove(os.path.join(UPLOADS_DIR, f))
    db.delete(log)
    db.commit()
    return {"message": "Deleted"}

@app.get("/api/logs/{log_id}/channels", response_model=List[schemas.Channel])
def get_log_channels_for_log(log_id: int, db: Session = Depends(get_db)):
    log_file = db.query(models.LogFile).get(log_id)
    if not log_file: raise HTTPException(status_code=404)
    return log_file.channels

@app.get("/api/logs/{log_id}/summary")
def get_log_summary(log_id: int, db: Session = Depends(get_db)):
    log_file = db.query(models.LogFile).get(log_id)
    if not log_file: raise HTTPException(status_code=404)
    cache_path = os.path.join(UPLOADS_DIR, f"{log_file.filename}.summary.json")
    if os.path.exists(cache_path):
        with open(cache_path, "r") as f: return json.load(f)
    return {}

@app.get("/api/logs/{log_id}/telemetry/{channel_id}", response_model=List[schemas.TelemetryDataPoint])
def get_telemetry_data(log_id: int, channel_id: int, db: Session = Depends(get_db)):
    cache_path = os.path.join(UPLOADS_DIR, f"log_{log_id}_ch_{channel_id}_v2.json")
    if os.path.exists(cache_path):
        with open(cache_path, "r") as f: return json.load(f)
    return []

@app.post("/api/logs/{log_id}/reparse")
def reparse_log(log_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    log = db.query(models.LogFile).get(log_id)
    if not log: raise HTTPException(status_code=404)
    log.status = "Processing"
    log.progress = 0
    db.commit()
    background_tasks.add_task(trigger_reparse_sync, log.id)
    return {"message": "Reparse started"}

@app.get("/api/logs/{log_id}/parsing-stats")
def get_parsing_stats(log_id: int, db: Session = Depends(get_db)):
    log = db.query(models.LogFile).get(log_id)
    if not log: raise HTTPException(status_code=404)
    stats_path = os.path.join(UPLOADS_DIR, f"{log.filename}.stats.json")
    if os.path.exists(stats_path):
        with open(stats_path, "r") as f: return json.load(f)
    return {"message": "Stats not available. Please reparse."}

@app.get("/api/debug/parsing-errors")
def download_parsing_errors():
    log_path = os.path.join(os.path.dirname(__file__), "..", "parsing_errors.log")
    if os.path.exists(log_path):
        return FileResponse(log_path, filename="parsing_errors.log")
    return {"message": "No parsing error log found yet."}

@app.delete("/api/debug/clear-logs")
def clear_logs():
    error_log = os.path.join(os.path.dirname(__file__), "..", "parsing_errors.log")
    backend_log = os.path.join(os.path.dirname(__file__), "..", "backend_logs.txt")
    for path in [error_log, backend_log]:
        if os.path.exists(path):
            try:
                with open(path, 'w'): pass
            except Exception as e:
                logger.error(f"Failed to clear {path}: {e}")
    return {"message": "Logs cleared"}

# Serve Frontend Static Files
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{rest_of_path:path}")
    async def serve_frontend(rest_of_path: str):
        if rest_of_path.startswith("api/"):
            raise HTTPException(status_code=404)
        file_path = os.path.join(frontend_dist, rest_of_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    def read_root(): return {"message": "IronClaw Robot Health Monitor API (Frontend not built)"}
