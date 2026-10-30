"""
About Router — Project Overview & Architecture Blueprint
BlockSync Railway Maintenance Block Joint Optimizer
"""

from typing import Any, Dict, List
from fastapi import APIRouter

router = APIRouter(tags=["About & Architecture"])


@router.get("/about")
def get_about_project() -> Dict[str, Any]:
    """
    Returns public architectural and operational context for BlockSync.
    """
    return {
        "problem_id": "BLOCKSYNC-TPJ",
        "project_name": "BlockSync — Joint Railway Maintenance Block Optimizer",
        "division": "Southern Railway · Tiruchirappalli Division (TPJ)",
        "corridors": [
            {
                "section_id": "A",
                "corridor_name": "Tiruchirappalli Jn – Srirangam",
                "code": "TPJ–SRGM",
                "track_type": "Double Line, 25kV AC",
                "daily_window": "06:00 – 10:00 (360–600m)"
            },
            {
                "section_id": "B",
                "corridor_name": "Tiruchirappalli Jn – Golden Rock",
                "code": "TPJ–GOC",
                "track_type": "Double Line, 25kV AC",
                "daily_window": "08:00 – 12:00 (480–720m)"
            },
            {
                "section_id": "C",
                "corridor_name": "Tiruchirappalli Jn – Karur Jn",
                "code": "TPJ–KRR",
                "track_type": "Single Line, 25kV AC",
                "daily_window": "10:00 – 14:00 (600–840m)"
            }
        ],
        "problem_context": {
            "title": "Multi-Departmental Railway Maintenance Fragmentation",
            "challenges": [
                "Departmental silos between Civil Engineering, S&T, and TRD lead to sequential track possessions.",
                "Sequential track blocks multiply total network downtime and disrupt passenger train timetables.",
                "Manual coordination across paper registers, CTC phone calls, and unofficial groups is mathematically intractable under high traffic pressure."
            ],
            "solution": "Automated joint maintenance slotting decision-support using Google OR-Tools CP-SAT discrete optimization."
        },
        "separation_of_concerns": {
            "ml_role": "ML decides WHAT matters most (prioritizing tasks by safety criticality, days overdue, and department risk).",
            "cpsat_role": "CP-SAT decides WHEN and WHERE tasks execute under hard physical, temporal, and electrical safety constraints.",
            "human_role": "Human Chief Traffic Controller reviews and holds final approval authority to accept, modify, or reject schedules and issue signed Sanction Orders for evaluation."
        },
        "data_provenance": {
            "real_public_data": "186,124 train stop records from official Ministry of Railways timetable on data.gov.in (277 TPJ corridor stops).",
            "real_derived_windows": "Maintenance shadow windows calculated from real non-traffic intervals between scheduled trains.",
            "synthetic_standardized_tasks": "Maintenance backlog formulated from Indian Railways Permanent Way Manual (IRPWM) and Signal Engineering Manual (SEM) inspection frequencies.",
            "synthetic_trained_ml": "Scikit-Learn RandomForest priority scoring trained on domain safety & delay escalation formula with real train/test metrics."
        },
        "ml_model_specifications": {
            "model_type": "RandomForestRegressor (scikit-learn, n_estimators=100, max_depth=5)",
            "validation_metrics": {
                "r2_score": 0.9902,
                "mae": 0.2232,
                "mse": 0.0816,
                "split": "80/20 train/test split (960 train / 240 test)"
            },
            "feature_importances": {
                "criticality": "66.27%",
                "days_overdue": "33.37%",
                "duration_minutes": "0.35%",
                "dept_risk": "0.01%"
            },
            "fallback_mechanism": "Direct fallback to raw task criticality if ML model is offline or unconfident."
        },
        "optimizer_specifications": {
            "solver_engine": "Google OR-Tools CP-SAT (Constraint Programming - Satisfiability)",
            "hard_constraints": [
                "Window assignment: exactly 1 valid window per scheduled task.",
                "Duration bounds: end_var == start_var + duration within window [start_minute, end_minute].",
                "Power isolation conflict (NoOverlap): TRD and non-TRD tasks on same corridor cannot overlap in time.",
                "Critical overdue execution: overdue tasks with criticality >= 4 are strictly mandatory."
            ],
            "objective_terms": [
                "+w1 (10) * bundled_pairs: maximizes co-utilization of compatible track blocks.",
                "+w2 (1) * criticality * scheduled: rewards executing high-priority maintenance.",
                "-w3 (3) * distinct_blocks: penalizes total distinct track possession requests.",
                "-w4 (8) * delay_days: penalizes scheduling tasks past target deadlines."
            ]
        },
        "operational_limitations": [
            "Weekly Planning Horizon (7 days) rather than full multi-month strategic master planning.",
            "Static Timetable Gap Derivation: assumes published timetable without real-time GPS locomotive tracking.",
            "Division Scope: Southern Railway Tiruchirappalli Division (TPJ-SRGM, TPJ-GOC, TPJ-KRR)."
        ]
    }
