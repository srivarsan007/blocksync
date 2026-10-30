"""
Human Decisions API Router — POST /decisions & GET /decisions
Records simulated coordinator approval, modification, or rejection actions.
"""

from typing import Any, Dict, List
from fastapi import APIRouter
from backend.db import get_all_human_decisions, record_human_decision
from backend.models import HumanDecision

router = APIRouter()


@router.post("/decisions", response_model=Dict[str, Any])
def create_decision(decision: HumanDecision):
    """Records a human coordinator action (approve/modify/reject)."""
    record_human_decision(decision)
    return {
        "status": "success",
        "message": f"Decision for task {decision.schedule_entry_id} recorded: {decision.action.value}",
        "decision": decision.model_dump()
    }


@router.get("/decisions", response_model=List[Dict[str, Any]])
def list_decisions():
    """Returns history of recorded coordinator decisions."""
    return get_all_human_decisions()