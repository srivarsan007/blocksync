"""
Schedule & Metrics API Router — /schedule/* & /metrics
Provides baseline scheduling, CP-SAT optimizer, and comparative metrics endpoints.
"""

from fastapi import APIRouter
from backend.models import (
    BaselineResponse,
    MetricsResponse,
    OptimizeResponse,
)
from backend.routes.tasks import get_tasks_and_windows_df
from optimizer.baseline import schedule_greedy
from optimizer.explain import ExplainabilityEngine
from optimizer.metrics import compute_schedule_metrics
from optimizer.solver import BlockOptimizerSolver

from optimizer.weekly_scheduler import solve_weekly_schedule

router = APIRouter()


@router.get("/schedule/weekly")
def get_weekly_schedule_endpoint():
    """Computes full 7-day multi-day CP-SAT schedule with deferral tracking across week."""
    return solve_weekly_schedule()


@router.post("/schedule/baseline", response_model=BaselineResponse)
@router.get("/schedule/baseline", response_model=BaselineResponse)
def get_baseline_schedule():
    """Computes naive greedy baseline schedule without bundling."""
    _, _, tasks_df, windows_df = get_tasks_and_windows_df()
    schedule = schedule_greedy(tasks_df, windows_df)
    metrics = compute_schedule_metrics(schedule, tasks_df, windows_df)
    return BaselineResponse(
        schedule=schedule,
        metrics=metrics
    )


@router.post("/schedule/optimize", response_model=OptimizeResponse)
@router.get("/schedule/optimize", response_model=OptimizeResponse)
def get_optimized_schedule():
    """Computes CP-SAT optimized schedule with bundling synergies and explanations."""
    _, _, tasks_df, windows_df = get_tasks_and_windows_df()
    solver = BlockOptimizerSolver(tasks_df, windows_df)
    schedule, status, infeasible_reasons, trace = solver.solve()
    metrics = compute_schedule_metrics(schedule, tasks_df, windows_df)
    
    explanations = []
    if schedule and status in ("OPTIMAL", "FEASIBLE"):
        explainer = ExplainabilityEngine(tasks_df, windows_df)
        explanations = explainer.generate_explanations(schedule, trace)

    return OptimizeResponse(
        status=status,
        schedule=schedule,
        infeasible_reasons=infeasible_reasons,
        metrics=metrics,
        explanations=explanations
    )


@router.get("/metrics", response_model=MetricsResponse)
def get_comparison_metrics():
    """Returns side-by-side metrics comparing baseline and CP-SAT schedules."""
    _, _, tasks_df, windows_df = get_tasks_and_windows_df()

    baseline_sched = schedule_greedy(tasks_df, windows_df)
    baseline_metrics = compute_schedule_metrics(baseline_sched, tasks_df, windows_df)

    solver = BlockOptimizerSolver(tasks_df, windows_df)
    opt_sched, _, _, _ = solver.solve()
    opt_metrics = compute_schedule_metrics(opt_sched, tasks_df, windows_df)

    return MetricsResponse(
        baseline=baseline_metrics,
        optimized=opt_metrics
    )