import json
import csv
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app import models

# Constants from frontend/backend logic
SUBSYSTEM_MAPPING = {
    'Drivetrain': ['drive', 'swerve', 'wheel', 'odometry', 'pose', 'gyro', 'pigeon', 'navx'],
    'Intake': ['intake', 'roller', 'arm', 'wrist'],
    'Spindexer': ['spindexer', 'indexer', 'carousel', 'hopper', 'transport'],
    'Shooter / Turret': ['shooter', 'flywheel', 'hood', 'turret', 'aim', 'tilt'],
    'Climb': ['climb', 'winch', 'hook', 'telescope'],
    '972_Valence_Platform': ['battery', 'pdp', 'pdh', 'rio', 'can', 'cpu', 'temp', 'cycle', 'voltage', 'fault', 'power', 'pressure', 'pneumatic'],
    'Vision': ['limelight', 'photon', 'camera', 'target'],
}

def get_category(name, min_v, max_v, avg_v, count):
    if count == 0: return "No Data"
    n = name.lower()
    
    # Error/Malfunction Logic
    if any(x in n for x in ['brownedout', 'fault', 'emergencystop']):
        if max_v > 0: return "Error/Malfunction"
    if any(x in n for x in ['errorcount', 'offcount']):
        if max_v > 10: return "Error/Malfunction"
    if "cyclems" in n and max_v > 40: return "Error/Malfunction"
    if "batteryvoltage" in n and min_v < 9.0: return "Error/Malfunction"
    if "rail/voltage" in n and avg_v < 4.5: return "Error/Malfunction"
    
    # System Under Stress Logic
    if any(x in n for x in ['errorcount', 'offcount']) and max_v > 0: return "System Under Stress"
    if "cyclems" in n and max_v > 22: return "System Under Stress"
    if "batteryvoltage" in n and min_v < 11.5: return "System Under Stress"
    if "rail/voltage" in n and avg_v < 6.3: return "System Under Stress"
    
    return "Functional Info"

def get_subsystem(name):
    n = name.lower()
    for subsystem, keywords in SUBSYSTEM_MAPPING.items():
        if any(kw in n for kw in keywords):
            return subsystem
    return "Other"

def run():
    SQLALCHEMY_DATABASE_URL = "sqlite:///./robot_telemetry.db"
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    log = db.query(models.LogFile).first()
    if not log:
        print("No log found in DB.")
        return
    
    summary_path = f"uploads/{log.filename}.summary.json"
    summary_data = {}
    if os.path.exists(summary_path):
        with open(summary_path, 'r') as f:
            summary_data = json.load(f)
    
    channels = db.query(models.Channel).filter(models.Channel.log_file_id == log.id).all()
    
    output_file = "robot_telemetry_manifest.csv"
    with open(output_file, 'w', newline='') as csvfile:
        fieldnames = ['Attribute Name', 'Type', 'Subsystem', 'Category', 'Min', 'Max', 'Average', 'Status Description']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for ch in channels:
            stats = summary_data.get(str(ch.id), {"min": 0, "max": 0, "avg": 0, "count": 0})
            category = get_category(ch.name, stats['min'], stats['max'], stats['avg'], stats['count'])
            subsystem = get_subsystem(ch.name)
            
            writer.writerow({
                'Attribute Name': ch.name,
                'Type': ch.type,
                'Subsystem': subsystem,
                'Category': category,
                'Min': stats['min'],
                'Max': stats['max'],
                'Average': round(stats['avg'], 3) if stats['avg'] else 0,
                'Status Description': f"Range: [{stats['min']}, {stats['max']}]"
            })
            
    print(f"Generated {output_file} with {len(channels)} entries.")
    db.close()

if __name__ == "__main__":
    run()
