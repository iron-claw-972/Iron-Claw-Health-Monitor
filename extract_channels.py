from wpiutil.log import DataLogReader
import json
import os

def extract_channels(log_path):
    if not os.path.exists(log_path):
        print(f"Error: {log_path} not found")
        return
    
    try:
        reader = DataLogReader(log_path)
    except Exception as e:
        print(f"Error opening log: {e}")
        return

    channels = {}
    for record in reader:
        if record.isStart():
            data = record.getStartData()
            channels[data.name] = data.type
            
    # Sort by name
    sorted_channels = [{"name": name, "type": channels[name]} for name in sorted(channels.keys())]
    print(json.dumps(sorted_channels, indent=2))

if __name__ == "__main__":
    extract_channels("valence-practicematch1-3-12.wpilog")
