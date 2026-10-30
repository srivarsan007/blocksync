from datetime import date
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DepartmentEnum(str, Enum):
    ENGINEERING = "Engineering"
    ST = "S&T"
    TRD = "TRD"


class TaskStatus(str, Enum):
    PENDING = "pending"
    SCHEDULED = "scheduled"
    COMPLETED = "completed"


class HumanAction(str, Enum):
    APPROVED = "approved"
    MODIFIED = "modified"
    REJECTED = "rejected"


class MaintenanceTask(BaseModel):
    id: str = Field(..., example="E1")
    department: DepartmentEnum
    section_id: str = Field(..., example="A")
    duration_minutes: int = Field(..., gt=0, example=45)
    criticality: int = Field(..., ge=1, le=5, example=5)
    due_date: date = Field(..., example="2026-09-05")
    status: TaskStatus = TaskStatus.PENDING
    description: Optional[str] = ""
    ml_priority_score: Optional[float] = None
    effective_priority: Optional[int] = None


class MaintenanceWindow(BaseModel):
    id: str = Field(..., example="W-A-morning")
    section_id: str
    start_time: int = Field(..., description="Minutes from day start, e.g. 360 for 06:00")
    end_time: int = Field(..., description="Minutes from day start, e.g. 600 for 10:00")
    source: str = "derived_from_timetable"


class EdgeRelation(BaseModel):
    task_id_1: str
    task_id_2: str
    reason: str


class ScheduleEntry(BaseModel):
    task_id: str
    assigned_window_id: str
    start_minute: int
    end_minute: int
    bundle_group_id: Optional[str] = None


class DecisionExplanation(BaseModel):
    schedule_entry_id: str
    reason_text: str
    constraint_involved: str
    conflict_avoided: Optional[str] = None
    synergy_captured: Optional[List[str]] = None


class HumanDecision(BaseModel):
    schedule_entry_id: str
    action: HumanAction
    timestamp: str
    note: Optional[str] = ""
    assigned_window_id: Optional[str] = None
    new_start_minute: Optional[int] = None
    new_end_minute: Optional[int] = None


class GraphResponse(BaseModel):
    conflicts: List[EdgeRelation]
    synergies: List[EdgeRelation]


class BaselineResponse(BaseModel):
    schedule: List[ScheduleEntry]
    metrics: Dict[str, Any]


class OptimizeResponse(BaseModel):
    status: str
    schedule: List[ScheduleEntry]
    infeasible_reasons: Optional[List[str]] = None
    metrics: Dict[str, Any]
    explanations: List[DecisionExplanation]


class MetricsResponse(BaseModel):
    baseline: Dict[str, Any]
    optimized: Dict[str, Any]


class TaskOptimizationResponse(BaseModel):
    status: str
    tasks: List[MaintenanceTask]
    windows: List[MaintenanceWindow]
    schedule: List[ScheduleEntry]
    baseline_schedule: List[ScheduleEntry]
    metrics: Dict[str, Any]
    baseline_metrics: Dict[str, Any]
    explanations: List[DecisionExplanation]
    conflicts: List[EdgeRelation]
    synergies: List[EdgeRelation]
    ml_metadata: Optional[Dict[str, Any]] = None
    ml_explanations: Optional[List[Dict[str, Any]]] = None


class UserRoleEnum(str, Enum):
    COORDINATOR = "coordinator"
    ENGINEERING = "Engineering"
    ST = "S&T"
    TRD = "TRD"


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    username: str
    role: str
    department_name: str
    message: str = "Authentication successful"


class UserSession(BaseModel):
    id: int
    username: str
    role: str
    department_name: str


class TaskCreateRequest(BaseModel):
    department: DepartmentEnum
    section_id: str
    duration_minutes: int = Field(..., gt=0)
    criticality: int = Field(..., ge=1, le=5)
    due_date: str
    description: Optional[str] = ""


