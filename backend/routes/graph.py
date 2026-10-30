"""
Graph API Router — GET /graph
Provides detected conflicts and bundling synergies across maintenance tasks.
"""

from fastapi import APIRouter
from backend.models import EdgeRelation, GraphResponse
from backend.routes.tasks import get_tasks_and_windows_df
from optimizer.graph import TaskGraphBuilder

router = APIRouter()


@router.get("/graph", response_model=GraphResponse)
def get_graph():
    """Returns detected conflict and synergy edges between maintenance tasks."""
    _, _, tasks_df, _ = get_tasks_and_windows_df()
    graph_builder = TaskGraphBuilder(tasks_df)
    
    conflicts_raw = graph_builder.get_conflicts()
    synergies_raw = graph_builder.get_synergies()

    conflicts = [EdgeRelation(task_id_1=u, task_id_2=v, reason=r) for u, v, r in conflicts_raw]
    synergies = [EdgeRelation(task_id_1=u, task_id_2=v, reason=r) for u, v, r in synergies_raw]

    return GraphResponse(
        conflicts=conflicts,
        synergies=synergies
    )