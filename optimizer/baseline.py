"""
Baseline Scheduler - Greedy/First-Come Scheduler (Phase 6)

This is the "before" comparison for honest benchmarking.
Logic: Process tasks in input order, assign each to the earliest non-conflicting window,
never check for bundling. This is the naive approach BlockSync improves upon.
"""

import pandas as pd
from typing import List, Dict, Tuple
from backend.models import MaintenanceTask, MaintenanceWindow, ScheduleEntry
def load_tasks_and_windows(tasks_path: str = "data/sample_dataset.csv", 
                           windows_path: str = "data/maintenance_windows.csv") -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Load tasks and maintenance windows from CSV files."""
    tasks_df = pd.read_csv(tasks_path)
    windows_df = pd.read_csv(windows_path)
    return tasks_df, windows_df


def get_conflicts(tasks_df: pd.DataFrame) -> Dict[str, List[str]]:
    """
    Build conflict map: task_id -> list of conflicting task_ids.
    Conflict: same section, TRD vs non-TRD (power isolation).
    """
    conflicts = {}
    for _, row in tasks_df.iterrows():
        conflicts[row['id']] = []
    
    for i, row_i in tasks_df.iterrows():
        for j, row_j in tasks_df.iterrows():
            if i >= j:
                continue
            if row_i['section_id'] == row_j['section_id']:
                if (row_i['department'] == 'TRD' and row_j['department'] != 'TRD') or \
                   (row_j['department'] == 'TRD' and row_i['department'] != 'TRD'):
                    conflicts[row_i['id']].append(row_j['id'])
                    conflicts[row_j['id']].append(row_i['id'])
    return conflicts
def schedule_greedy(tasks_df: pd.DataFrame, windows_df: pd.DataFrame) -> List[ScheduleEntry]:
    """
    Greedy baseline scheduler.
    
    Algorithm:
    1. Sort tasks by due_date (earliest first), then by criticality (highest first)
    2. For each task, find the first window on its section that has enough capacity
    3. Schedule at the earliest available time in that window
    4. Track used time slots per window to avoid overlaps with conflicting tasks
    5. NO BUNDLING - each task gets its own block
    
    Returns list of ScheduleEntry objects.
    """
    conflicts = get_conflicts(tasks_df)
    
    tasks_sorted = tasks_df.copy()
    tasks_sorted['due_date'] = pd.to_datetime(tasks_sorted['due_date'])
    tasks_sorted = tasks_sorted.sort_values(['due_date', 'criticality'], ascending=[True, False])
    
    window_schedule: Dict[str, List[Tuple[int, int, str]]] = {row['id']: [] for _, row in windows_df.iterrows()}
    
    schedule_entries = []
    
    for _, task in tasks_sorted.iterrows():
        task_id = task['id']
        section = task['section_id']
        duration = int(task['duration_minutes'])
        task_conflicts = conflicts[task_id]
        
        section_windows = windows_df[windows_df['section_id'] == section].sort_values('start_minute')
        
        scheduled = False
        for _, window in section_windows.iterrows():
            window_id = window['id']
            win_start = int(window['start_minute'])
            win_end = int(window['end_minute'])
            
            occupied_slots = []
            for (s, e, scheduled_task_id) in window_schedule[window_id]:
                if scheduled_task_id in task_conflicts:
                    occupied_slots.append((s, e))
            
            candidate_start = win_start
            while candidate_start + duration <= win_end:
                candidate_end = candidate_start + duration
                
                conflict = False
                for (s, e) in occupied_slots:
                    if not (candidate_end <= s or candidate_start >= e):
                        conflict = True
                        break
                
                if not conflict:
                    entry = ScheduleEntry(
                        task_id=task_id,
                        assigned_window_id=window_id,
                        start_minute=candidate_start,
                        end_minute=candidate_end,
                        bundle_group_id=None
                    )
                    schedule_entries.append(entry)
                    window_schedule[window_id].append((candidate_start, candidate_end, task_id))
                    scheduled = True
                    break
                
                for (s, e) in occupied_slots:
                    if not (candidate_end <= s or candidate_start >= e):
                        candidate_start = e
                        break
                else:
                    candidate_start += 1
            
            if scheduled:
                break
        
        if not scheduled:
            print(f"WARNING: Could not schedule task {task_id} (section {section}, duration {duration})")
    
    return schedule_entries
def compute_baseline_metrics(schedule: List[ScheduleEntry]) -> Dict:
    """Compute metrics for baseline schedule."""
    total_tasks = len(schedule)
    total_blocks = len(schedule)
    total_downtime = sum(e.end_minute - e.start_minute for e in schedule)
    bundled_pairs = 0
    
    return {
        "total_tasks_scheduled": total_tasks,
        "total_blocks_used": total_blocks,
        "total_downtime_minutes": total_downtime,
        "bundled_task_pairs": bundled_pairs,
        "avg_block_duration": total_downtime / total_blocks if total_blocks > 0 else 0
    }


if __name__ == "__main__":
    print("=== BASELINE GREEDY SCHEDULER ===")
    
    tasks_df, windows_df = load_tasks_and_windows()
    print(f"Loaded {len(tasks_df)} tasks and {len(windows_df)} windows")
    
    schedule = schedule_greedy(tasks_df, windows_df)
    
    print(f"\n=== BASELINE SCHEDULE ({len(schedule)} tasks) ===")
    for entry in schedule:
        print(f"  {entry.task_id}: Window={entry.assigned_window_id}, "
              f"Time={entry.start_minute}-{entry.end_minute} (duration={entry.end_minute - entry.start_minute}min), "
              f"Bundle={entry.bundle_group_id}")
    
    metrics = compute_baseline_metrics(schedule)
    print(f"\n=== BASELINE METRICS ===")
    for k, v in metrics.items():
        print(f"  {k}: {v}")