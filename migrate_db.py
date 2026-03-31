import sqlite3
import os

db_path = os.path.join('backend', 'robot_telemetry.db')
if os.path.exists(db_path):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # log_files columns
        columns_log_files = [
            ("status", "TEXT DEFAULT 'Ready'"),
            ("description", "TEXT"),
            ("file_size_bytes", "INTEGER"),
            ("progress", "INTEGER DEFAULT 0")
        ]
        
        for col_name, col_type in columns_log_files:
            try:
                cursor.execute(f"ALTER TABLE log_files ADD COLUMN {col_name} {col_type}")
                print(f"Added {col_name} to log_files")
            except sqlite3.OperationalError:
                pass # Already exists
        
        # channels columns
        try:
            cursor.execute("ALTER TABLE channels ADD COLUMN dashboard_visibility TEXT DEFAULT 'Display'")
            print("Added dashboard_visibility to channels")
        except sqlite3.OperationalError:
            pass # Already exists

        conn.commit()
        conn.close()
        print('Successfully updated database schema.')
    except Exception as e:
        print(f"Error during migration: {e}")
else:
    print(f"Database not found at {db_path}")
