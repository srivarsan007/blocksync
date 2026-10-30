"""
Weekly Planning Horizon Generator & Multi-Day Solver
BlockSync — Railway Maintenance Optimization Engine

Extends the single-day planning horizon to a full 7-day operational week:
- Generates 21 non-traffic maintenance windows across 7 days (Monday–Sunday)
  for Section A (TPJ-SRGM), Section B (TPJ-GOC), and Section C (TPJ-KRR).
- Evaluates multi-day task backlogs with deadline constraints, capacity limits,
  and intelligent multi-day deferrals.
"""

from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Tuple
import pandas as pd

from optimizer.baseline import schedule_greedy
from optimizer.explain import ExplainabilityEngine
from optimizer.graph import TaskGraphBuilder
from optimizer.metrics import compute_schedule_metrics
from optimizer.ml_priority import get_ml_priority_model
from optimizer.solver import BlockOptimizerSolver


def generate_weekly_windows(start_date: date = date(2026, 9, 1)) -> pd.DataFrame:
    """Generates 21 maintenance windows across 7 days on TPJ division corridors."""
    days = [start_date + timedelta(days=i) for i in range(7)]
    windows_list = []

    for day_idx, d in enumerate(days):
        day_offset = day_idx * 1440
        d_name = d.strftime("%a %d %b")

        # Section A (TPJ - SRGM): 06:00 - 10:00 (360 to 600 mins)
        windows_list.append({
            "id": f"W-A-D{day_idx+1}",
            "section_id": "A",
            "day_index": day_idx,
            "date": str(d),
            "day_name": d_name,
            "start_minute": day_offset + 360,
            "end_minute": day_offset + 600,
            "available_duration_minutes": 240,
            "corridor": "Tiruchirappalli Jn – Srirangam"
        })

        # Section B (TPJ - GOC): 08:00 - 12:00 (480 to 720 mins)
        windows_list.append({
            "id": f"W-B-D{day_idx+1}",
            "section_id": "B",
            "day_index": day_idx,
            "date": str(d),
            "day_name": d_name,
            "start_minute": day_offset + 480,
            "end_minute": day_offset + 720,
            "available_duration_minutes": 240,
            "corridor": "Tiruchirappalli Jn – Golden Rock"
        })

        # Section C (TPJ - KRR): 10:00 - 14:00 (600 to 840 mins)
        windows_list.append({
            "id": f"W-C-D{day_idx+1}",
            "section_id": "C",
            "day_index": day_idx,
            "date": str(d),
            "day_name": d_name,
            "start_minute": day_offset + 600,
            "end_minute": day_offset + 840,
            "available_duration_minutes": 240,
            "corridor": "Tiruchirappalli Jn – Karur Jn"
        })

    return pd.DataFrame(windows_list)


def get_default_weekly_tasks() -> pd.DataFrame:
    """Returns a realistic 7-day maintenance task backlog for TPJ division."""
    tasks = [
        # Day 1 (Tuesday 01 Sep) Standard Tasks
        {"id": "E1", "department": "Engineering", "section_id": "A", "duration_minutes": 45, "criticality": 5, "due_date": "2026-09-01", "status": "pending"},
        {"id": "S1", "department": "S&T", "section_id": "A", "duration_minutes": 30, "criticality": 5, "due_date": "2026-09-01", "status": "pending"},
        {"id": "T1", "department": "TRD", "section_id": "A", "duration_minutes": 40, "criticality": 5, "due_date": "2026-09-01", "status": "pending"},
        {"id": "E2", "department": "Engineering", "section_id": "A", "duration_minutes": 60, "criticality": 4, "due_date": "2026-08-25", "status": "pending"},
        {"id": "S2", "department": "S&T", "section_id": "B", "duration_minutes": 25, "criticality": 3, "due_date": "2026-09-02", "status": "pending"},
        {"id": "E3", "department": "Engineering", "section_id": "B", "duration_minutes": 50, "criticality": 3, "due_date": "2026-09-02", "status": "pending"},
        {"id": "T2", "department": "TRD", "section_id": "B", "duration_minutes": 35, "criticality": 2, "due_date": "2026-09-03", "status": "pending"},
        {"id": "E4", "department": "Engineering", "section_id": "C", "duration_minutes": 40, "criticality": 2, "due_date": "2026-09-04", "status": "pending"},
        {"id": "S3", "department": "S&T", "section_id": "C", "duration_minutes": 20, "criticality": 1, "due_date": "2026-09-04", "status": "pending"},

        # Multi-Day Contention & Deferral Demonstration:
        # Task E5 (150m Track Renewal) and Task T0 (120m OHE Isolator Replacement) are both due on Day 1 (2026-09-01).
        # Since Day 1 Section A window (240m) cannot fit bundled engineering tasks (150m) + T1 (40m) + T0 (120m) = 310m > 240m,
        # Task T0 is constrained by track capacity and is deferred to Day 2 (2026-09-02).
        {"id": "E5", "department": "Engineering", "section_id": "A", "duration_minutes": 150, "criticality": 4, "due_date": "2026-09-01", "status": "pending"},
        {"id": "T0", "department": "TRD", "section_id": "A", "duration_minutes": 120, "criticality": 4, "due_date": "2026-09-01", "status": "pending"},

        # Mid-Week Tasks (Day 3 & Day 4: 03-04 Sep)
        {"id": "T3", "department": "TRD", "section_id": "A", "duration_minutes": 80, "criticality": 4, "due_date": "2026-09-03", "status": "pending"},
        {"id": "S4", "department": "S&T", "section_id": "B", "duration_minutes": 45, "criticality": 3, "due_date": "2026-09-04", "status": "pending"},
        {"id": "E6", "department": "Engineering", "section_id": "B", "duration_minutes": 70, "criticality": 3, "due_date": "2026-09-04", "status": "pending"},

        # Weekend Tasks (Day 5 to Day 7: 05-07 Sep)
        {"id": "T4", "department": "TRD", "section_id": "C", "duration_minutes": 90, "criticality": 4, "due_date": "2026-09-05", "status": "pending"},
        {"id": "E7", "department": "Engineering", "section_id": "C", "duration_minutes": 60, "criticality": 3, "due_date": "2026-09-06", "status": "pending"},
        {"id": "S5", "department": "S&T", "section_id": "A", "duration_minutes": 35, "criticality": 3, "due_date": "2026-09-07", "status": "pending"},
    ]
    return pd.DataFrame(tasks)


def solve_weekly_schedule(
    tasks_df: pd.DataFrame = None,
    start_date: date = date(2026, 9, 1)
) -> Dict[str, Any]:
    """Solves the weekly maintenance scheduling problem with CP-SAT and ML priority."""
    if tasks_df is None:
        tasks_df = get_default_weekly_tasks()

    windows_df = generate_weekly_windows(start_date)

    # 1. ML Priority Scoring
    ml_model = get_ml_priority_model()
    scored_tasks_df, ml_explanations = ml_model.score_tasks(tasks_df, planning_date=start_date)

    # 2. Graph Detection
    graph_builder = TaskGraphBuilder(scored_tasks_df)
    conflicts_raw = graph_builder.get_conflicts()
    synergies_raw = graph_builder.get_synergies()

    # 3. Solver Execution
    solver = BlockOptimizerSolver(scored_tasks_df, windows_df, planning_date=start_date)
    schedule, status, infeasible_reasons, trace = solver.solve()

    # 4. Explainability & Deferral Analysis
    explainer = ExplainabilityEngine(scored_tasks_df, windows_df)
    explanations = explainer.generate_explanations(schedule, trace)

    # Deferral detections
    deferrals = []
    days = [start_date + timedelta(days=i) for i in range(7)]
    for entry in schedule:
        task_row = scored_tasks_df[scored_tasks_df["id"] == entry.task_id].iloc[0]
        due_date_obj = pd.to_datetime(task_row["due_date"]).date()
        scheduled_day_idx = entry.start_minute // 1440
        scheduled_date = days[min(scheduled_day_idx, 6)]

        if scheduled_date > due_date_obj:
            days_deferred = (scheduled_date - due_date_obj).days
            deferrals.append({
                "task_id": entry.task_id,
                "department": task_row["department"],
                "section_id": task_row["section_id"],
                "due_date": str(due_date_obj),
                "scheduled_date": str(scheduled_date),
                "scheduled_window": entry.assigned_window_id,
                "days_deferred": days_deferred,
                "reason": f"Task {entry.task_id} ({task_row['duration_minutes']}m) deferred {days_deferred} day(s) due to section window capacity and conflict isolation on earlier days."
            })

    metrics = compute_schedule_metrics(schedule, scored_tasks_df, windows_df)

    return {
        "status": status,
        "total_tasks": len(tasks_df),
        "scheduled_tasks": len(schedule),
        "schedule": schedule,
        "windows": windows_df.to_dict(orient="records"),
        "metrics": metrics,
        "deferrals": deferrals,
        "explanations": explanations,
        "ml_metadata": ml_model.training_metadata
    }


if __name__ == "__main__":
    result = solve_weekly_schedule()
    print("=== Weekly Planning Horizon Solve Result ===")
    print(f"Status: {result['status']}")
    print(f"Total Tasks: {result['total_tasks']} | Scheduled: {result['scheduled_tasks']}")
    print(f"\nDeferred Tasks ({len(result['deferrals'])}):")
    for d in result["deferrals"]:
        print(f"  • {d['task_id']} ({d['department']}): Due {d['due_date']} -> Scheduled {d['scheduled_date']} ({d['scheduled_window']})")
        print(f"    Reason: {d['reason']}")
