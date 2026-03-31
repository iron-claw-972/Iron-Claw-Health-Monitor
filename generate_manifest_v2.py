import json
import csv

def generate_manifest():
    try:
        with open('new_log_channels.json', 'r', encoding='utf-16') as f:
            channels = json.load(f)
    except:
        with open('new_log_channels.json', 'r', encoding='utf-8') as f:
            channels = json.load(f)

    # Subsystem mapping rules
    MAPPING = {
        'Drivetrain': ['drive', 'gyro', 'odometry', 'swerve'],
        'Vision': ['vision', 'photonalerts', 'apriltags'],
        'Intake': ['intake', 'roller'],
        'Shooter': ['shooter', 'flywheel', 'hood', 'indexer'],
        'Climber': ['climb', 'winch'],
        'Power Subsystem': ['powerdistribution', 'battery'],
        '972_Valence_Platform': ['systemstats', 'radiostatus', 'loggedrobot', 'logger', 'alerts', 'pathplanner'],
        'Console Messages': ['console', 'comments']
    }

    manifest = []
    seen_names = set()

    for ch in channels:
        name = ch['name']
        
        # 1. Clean the name (strip NT:/AdvantageKit/ and NT:/)
        clean_name = name.replace('NT:/AdvantageKit/', '/').replace('NT:/', '/')
        if not clean_name.startswith('/'): clean_name = '/' + clean_name

        # 2. Skip duplicates and sub-attributes (indices like /0, /1, /value, /length)
        if any(x in clean_name for x in ['/0', '/1', '/2', '/3', '/4', '/5', '/6', '/7', '/8', '/9', '/value', '/length', '/.schema']):
            continue
            
        if clean_name in seen_names:
            continue
        seen_names.add(clean_name)

        # 3. Assign Subsystem
        subsystem = 'Other'
        lower_name = clean_name.lower()
        for sub, keywords in MAPPING.items():
            if any(k in lower_name for k in keywords):
                subsystem = sub
                break
        
        manifest.append({
            'Subsystem': subsystem,
            'Attribute Name': clean_name,
            'Source Channel': name,
            'Data Type': ch['type']
        })

    # Save to CSV
    with open('robot_telemetry_manifest_v2.csv', 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['Subsystem', 'Attribute Name', 'Source Channel', 'Data Type'])
        writer.writeheader()
        writer.writerows(manifest)

    print(f"Generated manifest with {len(manifest)} unique attributes.")

if __name__ == "__main__":
    generate_manifest()
