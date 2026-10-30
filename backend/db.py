"""
SQLite Database Layer — Phase 9
Provides persistence for tasks, windows, schedules, explanations, and decisions.
"""

import json
import os
import sqlite3
from pathlib import Path
from typing import Dict, List, Optional
import bcrypt
import pandas as pd

from backend.models import (
    DecisionExplanation,
    DepartmentEnum,
    HumanDecision,
    MaintenanceTask,
    MaintenanceWindow,
    ScheduleEntry,
    TaskStatus,
)

DB_PATH = Path("data/blocksync.db")

# Demo Mode Flag: controls whether seeded evaluation accounts are populated
DEMO_MODE_RAW = os.getenv("BLOCKSYNC_DEMO_MODE", "true").strip().lower()
DEMO_MODE = DEMO_MODE_RAW not in ("0", "false", "no", "off")

# Fixed Seeded Accounts (enabled when BLOCKSYNC_DEMO_MODE=true)
SEEDED_ACCOUNTS = [
    {
        "username": "coordinator_desk",
        "password": "coordinator123",
        "role": "coordinator",
        "department_name": "Central Traffic Control / Coordinator Desk",
    },
    {
        "username": "engineering_desk",
        "password": "engineer123",
        "role": "Engineering",
        "department_name": "Civil Engineering Department",
    },
    {
        "username": "snt_desk",
        "password": "snt123",
        "role": "S&T",
        "department_name": "Signal & Telecom (S&T) Department",
    },
    {
        "username": "trd_desk",
        "password": "trd123",
        "role": "TRD",
        "department_name": "Traction Distribution (TRD) Department",
    },
]


def hash_password(password: str) -> str:
    """Hashes password using bcrypt with standard salt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against stored bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes SQLite database tables and populates sample data and seeded accounts."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        department_name TEXT NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        department TEXT NOT NULL,
        section_id TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        criticality INTEGER NOT NULL,
        due_date TEXT NOT NULL,
        status TEXT NOT NULL,
        description TEXT DEFAULT ''
    );
    """)

    # Ensure description column exists if table was previously created
    cursor.execute("PRAGMA table_info(tasks);")
    task_cols = [row[1] for row in cursor.fetchall()]
    if "description" not in task_cols:
        cursor.execute("ALTER TABLE tasks ADD COLUMN description TEXT DEFAULT '';")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS windows (
        id TEXT PRIMARY KEY,
        section_id TEXT NOT NULL,
        start_minute INTEGER NOT NULL,
        end_minute INTEGER NOT NULL,
        available_duration_minutes INTEGER NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS decisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_entry_id TEXT NOT NULL,
        action TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        note TEXT,
        assigned_window_id TEXT,
        start_minute INTEGER,
        end_minute INTEGER
    );
    """)

    # Ensure decision columns exist if table was previously created
    cursor.execute("PRAGMA table_info(decisions);")
    dec_cols = [row[1] for row in cursor.fetchall()]
    if "assigned_window_id" not in dec_cols:
        cursor.execute("ALTER TABLE decisions ADD COLUMN assigned_window_id TEXT DEFAULT NULL;")
    if "start_minute" not in dec_cols:
        cursor.execute("ALTER TABLE decisions ADD COLUMN start_minute INTEGER DEFAULT NULL;")
    if "end_minute" not in dec_cols:
        cursor.execute("ALTER TABLE decisions ADD COLUMN end_minute INTEGER DEFAULT NULL;")

    conn.commit()

    # Seed the 4 fixed accounts if not present (only when BLOCKSYNC_DEMO_MODE=true)
    if DEMO_MODE:
        for acc in SEEDED_ACCOUNTS:
            cursor.execute("SELECT id FROM users WHERE username = ?", (acc["username"],))
            if not cursor.fetchone():
                hashed = hash_password(acc["password"])
                cursor.execute("""
                    INSERT INTO users (username, password_hash, role, department_name)
                    VALUES (?, ?, ?, ?)
                """, (acc["username"], hashed, acc["role"], acc["department_name"]))
        conn.commit()

    # Populate tasks if empty
    cursor.execute("SELECT COUNT(*) FROM tasks;")
    if cursor.fetchone()[0] == 0 and Path("data/sample_dataset.csv").exists():
        tasks_df = pd.read_csv("data/sample_dataset.csv")
        for _, row in tasks_df.iterrows():
            desc_val = str(row['description']) if 'description' in row and pd.notna(row['description']) else ""
            cursor.execute("""
                INSERT INTO tasks (id, department, section_id, duration_minutes, criticality, due_date, status, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (row['id'], row['department'], row['section_id'], int(row['duration_minutes']), int(row['criticality']), str(row['due_date']), row['status'], desc_val))
        conn.commit()

    # Populate windows if empty
    cursor.execute("SELECT COUNT(*) FROM windows;")
    if cursor.fetchone()[0] == 0 and Path("data/maintenance_windows.csv").exists():
        windows_df = pd.read_csv("data/maintenance_windows.csv")
        for _, row in windows_df.iterrows():
            cursor.execute("""
                INSERT INTO windows (id, section_id, start_minute, end_minute, available_duration_minutes)
                VALUES (?, ?, ?, ?, ?)
            """, (row['id'], row['section_id'], int(row['start_minute']), int(row['end_minute']), int(row['available_duration_minutes'])))
        conn.commit()

    conn.close()


def get_all_tasks() -> List[MaintenanceTask]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks")
    rows = cursor.fetchall()
    conn.close()

    tasks = []
    for r in rows:
        r_keys = r.keys() if hasattr(r, "keys") else []
        desc = r['description'] if 'description' in r_keys else ""
        tasks.append(
            MaintenanceTask(
                id=r['id'],
                department=r['department'],
                section_id=r['section_id'],
                duration_minutes=r['duration_minutes'],
                criticality=r['criticality'],
                due_date=r['due_date'],
                status=r['status'],
                description=desc or ""
            )
        )
    return tasks


def get_all_windows() -> List[MaintenanceWindow]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM windows")
    rows = cursor.fetchall()
    conn.close()

    windows = []
    for r in rows:
        windows.append(
            MaintenanceWindow(
                id=r['id'],
                section_id=r['section_id'],
                start_time=r['start_minute'],
                end_time=r['end_minute'],
                source="derived_from_timetable"
            )
        )
    return windows


def record_human_decision(decision: HumanDecision):
    conn = get_db_connection()
    cursor = conn.cursor()
    action_val = decision.action.value if hasattr(decision.action, "value") else str(decision.action)
    cursor.execute("""
        INSERT INTO decisions (schedule_entry_id, action, timestamp, note, assigned_window_id, start_minute, end_minute)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        decision.schedule_entry_id,
        action_val,
        decision.timestamp,
        decision.note or "",
        decision.assigned_window_id,
        decision.new_start_minute,
        decision.new_end_minute
    ))
    conn.commit()
    conn.close()


def get_all_human_decisions() -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM decisions ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_user_by_username(username: str) -> Optional[Dict]:
    """Fetches user record from database by username."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def authenticate_user(username: str, plain_password: str) -> Optional[Dict]:
    """Authenticates username and password against bcrypt hash in database."""
    user = get_user_by_username(username)
    if not user:
        return None
    if verify_password(plain_password, user["password_hash"]):
        return {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "department_name": user["department_name"],
        }
    return None


def insert_task(task: MaintenanceTask) -> MaintenanceTask:
    """Inserts a new maintenance request into SQLite tasks table."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO tasks (id, department, section_id, duration_minutes, criticality, due_date, status, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        task.id,
        task.department.value if hasattr(task.department, "value") else str(task.department),
        task.section_id,
        task.duration_minutes,
        task.criticality,
        str(task.due_date),
        task.status.value if hasattr(task.status, "value") else str(task.status),
        task.description or ""
    ))
    conn.commit()
    conn.close()
    return task


def get_tasks_by_department(department: str) -> List[MaintenanceTask]:
    """Fetches all tasks belonging to a specific department."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks WHERE department = ?", (department,))
    rows = cursor.fetchall()
    conn.close()

    tasks = []
    for r in rows:
        r_keys = r.keys() if hasattr(r, "keys") else []
        desc = r['description'] if 'description' in r_keys else ""
        tasks.append(
            MaintenanceTask(
                id=r["id"],
                department=r["department"],
                section_id=r["section_id"],
                duration_minutes=r["duration_minutes"],
                criticality=r["criticality"],
                due_date=r["due_date"],
                status=r["status"],
                description=desc or ""
            )
        )
    return tasks

