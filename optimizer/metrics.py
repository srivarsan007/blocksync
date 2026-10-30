"""
Metrics Computation Module — Phase 8/9
Computes before/after comparison metrics for BlockSync schedules (Section 19).
"""

from datetime import date
from typing import Dict, List
import pandas as pd

from backend.models import ScheduleEntry
from optimizer.graph import TaskGraphBuilder


def compute_schedule_metrics(
    schedule: List[ScheduleEntry],
    tasks_df: pd.DataFrame,
    windows_df: pd.DataFrame,
    planning_date: date = date(2026, 9, 1)
) -> Dict:
    """Computes accurate, un-fabricated metrics directly from a schedule."""
    if not schedule:
        return {
            "total_tasks_scheduled": 0,
            "total_blocks_used": 0,
            "total_downtime_minutes": 0,
            "bundled_task_pairs": 0,
            "conflicts_resolved": 0,
            "criticality_weighted_ontime": 0,
            "overdue_tasks_remaining": 0,
            "schedule_utilization": 0.0
        }

    graph = TaskGraphBuilder(tasks_df)
    conflicts = graph.get_conflicts()
    conflicts_resolved_count = len(conflicts)

    # Calculate blocks: tasks sharing bundle_group_id or same (window, start_time) share a block
    block_groups = {}
    for entry in schedule:
        if entry.bundle_group_id:
            bg_key = entry.bundle_group_id
        else:
            bg_key = f"SINGLE-{entry.assigned_window_id}-{entry.start_minute}-{entry.task_id}"
        block_groups.setdefault(bg_key, []).append(entry)

    total_blocks_used = len(block_groups)

    # Calculate total downtime: for each block group, downtime = max(end_minute) - min(start_minute)
    total_downtime = 0
    bundled_pairs_count = 0

    for bg_key, entries in block_groups.items():
        min_start = min(e.start_minute for e in entries)
        max_end = max(e.end_minute for e in entries)
        total_downtime += (max_end - min_start)

        if len(entries) > 1:
            bundled_pairs_count += (len(entries) - 1)

    # Criticality and overdue stats
    ontime_criticality = 0
    overdue_remaining = 0

    for entry in schedule:
        task_row = tasks_df[tasks_df['id'] == entry.task_id].iloc[0]
        due_date = pd.to_datetime(task_row['due_date']).date()
        crit = int(task_row['criticality'])

        if due_date >= planning_date:
            ontime_criticality += crit
        else:
            overdue_remaining += 1

    # Total available window capacity
    total_window_capacity = int(windows_df['available_duration_minutes'].sum())
    utilization = round(total_downtime / total_window_capacity, 3) if total_window_capacity > 0 else 0.0

    return {
        "total_tasks_scheduled": len(schedule),
        "total_blocks_used": total_blocks_used,
        "total_downtime_minutes": total_downtime,
        "bundled_task_pairs": bundled_pairs_count,
        "conflicts_resolved": conflicts_resolved_count,
        "criticality_weighted_ontime": ontime_criticality,
        "overdue_tasks_remaining": overdue_remaining,
        "schedule_utilization": utilization
    }


if __name__ == "__main__":
    from optimizer.baseline import schedule_greedy
    from optimizer.solver import BlockOptimizerSolver

    tasks = pd.read_csv("data/sample_dataset.csv")
    windows = pd.read_csv("data/maintenance_windows.csv")

    baseline_schedule = schedule_greedy(tasks, windows)
    baseline_metrics = compute_schedule_metrics(baseline_schedule, tasks, windows)

    solver = BlockOptimizerSolver(tasks, windows)
    opt_schedule, status, _, _ = solver.solve()
    opt_metrics = compute_schedule_metrics(opt_schedule, tasks, windows)

    print("=== METRICS COMPARISON ===")
    print(f"{'Metric':<30} | {'Baseline':<12} | {'Optimized':<12}")
    print("-" * 60)
    for key in baseline_metrics:
        b_val = baseline_metrics[key]
        o_val = opt_metrics[key]
        print(f"{key:<30} | {str(b_val):<12} | {str(o_val):<12}")
