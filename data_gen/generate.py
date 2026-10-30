import pandas as pd

# Header: synthetic: true, generated_for: BlockSync evaluation demo

tasks_data = [
    # Section A - Guaranteed SYNERGY pair (Engineering E1 + S&T S1)
    {"id": "E1", "department": "Engineering", "section_id": "A", "duration_minutes": 45, "criticality": 5, "due_date": "2026-09-01", "status": "pending"},
    {"id": "S1", "department": "S&T", "section_id": "A", "duration_minutes": 30, "criticality": 5, "due_date": "2026-09-01", "status": "pending"},
    
    # Section A - Guaranteed CONFLICT pair (TRD T1 requires power isolation vs E1/S1)
    {"id": "T1", "department": "TRD", "section_id": "A", "duration_minutes": 40, "criticality": 5, "due_date": "2026-09-01", "status": "pending"},
    
    # Section A - Overdue Task
    {"id": "E2", "department": "Engineering", "section_id": "A", "duration_minutes": 60, "criticality": 4, "due_date": "2026-08-25", "status": "pending"},
    
    # Section B Tasks
    {"id": "S2", "department": "S&T", "section_id": "B", "duration_minutes": 25, "criticality": 3, "due_date": "2026-09-02", "status": "pending"},
    {"id": "E3", "department": "Engineering", "section_id": "B", "duration_minutes": 50, "criticality": 3, "due_date": "2026-09-02", "status": "pending"},
    {"id": "T2", "department": "TRD", "section_id": "B", "duration_minutes": 35, "criticality": 2, "due_date": "2026-09-03", "status": "pending"},
    
    # Section C Tasks
    {"id": "E4", "department": "Engineering", "section_id": "C", "duration_minutes": 40, "criticality": 2, "due_date": "2026-09-04", "status": "pending"},
    {"id": "S3", "department": "S&T", "section_id": "C", "duration_minutes": 20, "criticality": 1, "due_date": "2026-09-04", "status": "pending"}
]

df = pd.DataFrame(tasks_data)
df.to_csv("data/sample_dataset.csv", index=False)
print("Successfully generated data/sample_dataset.csv!")

# Maintenance Windows - tight windows to force scheduling decisions
# Minutes from midnight: 360=06:00, 600=10:00, 480=08:00, 720=12:00, 600=10:00, 840=14:00
windows_data = [
    {"id": "W-A-morning", "section_id": "A", "start_minute": 360, "end_minute": 600, "available_duration_minutes": 240},
    {"id": "W-B-morning", "section_id": "B", "start_minute": 480, "end_minute": 720, "available_duration_minutes": 240},
    {"id": "W-C-morning", "section_id": "C", "start_minute": 600, "end_minute": 840, "available_duration_minutes": 240},
]

windows_df = pd.DataFrame(windows_data)
windows_df.to_csv("data/maintenance_windows.csv", index=False)
print("Successfully generated data/maintenance_windows.csv!")
