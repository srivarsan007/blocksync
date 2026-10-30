"""
Tasks API Router — GET /tasks & POST /tasks/optimize
Provides full task list, optimization schedule, baseline comparison, metrics, and explanations.
"""

from pathlib import Path
from typing import List, Tuple
import pandas as pd
from fastapi import APIRouter, HTTPException

from backend.db import get_all_tasks, get_all_windows, init_db
from backend.models import (
    EdgeRelation,
    MaintenanceTask,
    MaintenanceWindow,
    TaskCreateRequest,
    TaskOptimizationResponse,
)
from optimizer.baseline import schedule_greedy
from optimizer.explain import ExplainabilityEngine
from optimizer.graph import TaskGraphBuilder
from optimizer.metrics import compute_schedule_metrics
from optimizer.ml_priority import get_ml_priority_model
from optimizer.solver import BlockOptimizerSolver

router = APIRouter()


def get_tasks_and_windows_df() -> Tuple[List[MaintenanceTask], List[MaintenanceWindow], pd.DataFrame, pd.DataFrame]:
    """Helper to retrieve tasks and windows as both Pydantic models and Pandas DataFrames."""
    tasks = get_all_tasks()
    windows = get_all_windows()
    if not tasks:
        init_db()
        tasks = get_all_tasks()
        windows = get_all_windows()

    if not tasks:
        # Fallback to direct CSV read if DB was empty
        if Path("data/sample_dataset.csv").exists() and Path("data/maintenance_windows.csv").exists():
            tasks_df = pd.read_csv("data/sample_dataset.csv")
            windows_df = pd.read_csv("data/maintenance_windows.csv")
            return tasks, windows, tasks_df, windows_df
        raise HTTPException(status_code=404, detail="No tasks or maintenance windows found in database.")

    tasks_data = [t.model_dump() for t in tasks]
    windows_data = [
        {
            "id": w.id,
            "section_id": w.section_id,
            "start_minute": w.start_time,
            "end_minute": w.end_time,
            "available_duration_minutes": w.end_time - w.start_time,
        }
        for w in windows
    ]
    tasks_df = pd.DataFrame(tasks_data)
    windows_df = pd.DataFrame(windows_data)
    return tasks, windows, tasks_df, windows_df


def run_full_pipeline() -> TaskOptimizationResponse:
    """Executes the complete optimization pipeline with ML Priority scoring and returns structured response."""
    tasks, windows, tasks_df, windows_df = get_tasks_and_windows_df()

    # 0. Honest ML Priority Scoring
    ml_model = get_ml_priority_model()
    scored_tasks_df, ml_explanations = ml_model.score_tasks(tasks_df)
    ml_metadata = {
        "metrics": ml_model.metrics,
        "feature_importances": ml_model.feature_importances,
        "metadata": ml_model.training_metadata
    }

    # Synchronize ML priority scores into task models
    scored_tasks = []
    for t in tasks:
        t_dict = t.model_dump()
        match = scored_tasks_df[scored_tasks_df["id"] == t.id]
        if not match.empty:
            t_dict["ml_priority_score"] = float(match.iloc[0]["ml_priority_score"])
            t_dict["effective_priority"] = int(match.iloc[0]["effective_priority"])
        scored_tasks.append(MaintenanceTask(**t_dict))

    # 1. Graph Edge Detection
    graph_builder = TaskGraphBuilder(scored_tasks_df)
    conflicts_raw = graph_builder.get_conflicts()
    synergies_raw = graph_builder.get_synergies()

    conflicts = [EdgeRelation(task_id_1=u, task_id_2=v, reason=r) for u, v, r in conflicts_raw]
    synergies = [EdgeRelation(task_id_1=u, task_id_2=v, reason=r) for u, v, r in synergies_raw]

    # 2. Baseline Greedy Schedule & Metrics
    baseline_schedule = schedule_greedy(scored_tasks_df, windows_df)
    baseline_metrics = compute_schedule_metrics(baseline_schedule, scored_tasks_df, windows_df)

    # 3. CP-SAT Optimization Solver (feeds ML priority into criticality term w2)
    solver = BlockOptimizerSolver(scored_tasks_df, windows_df)
    schedule, status, infeasible_reasons, trace = solver.solve()
    opt_metrics = compute_schedule_metrics(schedule, scored_tasks_df, windows_df)

    # 4. Explainability Engine
    explanations = []
    if schedule and status in ("OPTIMAL", "FEASIBLE"):
        explainer = ExplainabilityEngine(scored_tasks_df, windows_df)
        explanations = explainer.generate_explanations(schedule, trace)

    return TaskOptimizationResponse(
        status=status,
        tasks=scored_tasks,
        windows=windows,
        schedule=schedule,
        baseline_schedule=baseline_schedule,
        metrics=opt_metrics,
        baseline_metrics=baseline_metrics,
        explanations=explanations,
        conflicts=conflicts,
        synergies=synergies,
        ml_metadata=ml_metadata,
        ml_explanations=ml_explanations,
    )


@router.get("/tasks", response_model=TaskOptimizationResponse)
def get_tasks_endpoint():
    """Returns all maintenance tasks alongside CP-SAT optimization results, metrics, and baseline comparison."""
    return run_full_pipeline()


@router.post("/tasks/optimize", response_model=TaskOptimizationResponse)
def optimize_tasks_endpoint():
    """Trigger on-demand task optimization and return scheduled metrics."""
    return run_full_pipeline()


@router.post("/tasks", response_model=TaskOptimizationResponse)
def create_task_endpoint(payload: TaskCreateRequest):
    """
    Submits a new department maintenance block request, persists it into SQLite,
    and re-runs CP-SAT optimization dynamically.
    """
    from backend.db import insert_task
    from backend.models import TaskStatus

    existing_tasks = get_all_tasks()
    dept_val = payload.department.value if hasattr(payload.department, "value") else str(payload.department)

    prefix = "E" if dept_val == "Engineering" else ("S" if dept_val == "S&T" else "T")
    matching_ids = [
        int(t.id[1:]) for t in existing_tasks
        if t.id.startswith(prefix) and t.id[1:].isdigit()
    ]
    next_num = max(matching_ids, default=0) + 1
    new_task_id = f"{prefix}{next_num}"

    new_task = MaintenanceTask(
        id=new_task_id,
        department=payload.department,
        section_id=payload.section_id,
        duration_minutes=payload.duration_minutes,
        criticality=payload.criticality,
        due_date=payload.due_date,
        status=TaskStatus.PENDING,
        description=payload.description or ""
    )

    insert_task(new_task)
    return run_full_pipeline()


