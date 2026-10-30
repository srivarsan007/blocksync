"""
BlockSync FastAPI Application Entry Point
Cross-Department Railway Maintenance Block Optimization Engine
"""

import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger("blocksync")

from backend.db import init_db
import sys
from backend.db import is_demo_mode
from backend.routes.auth import router as auth_router
from backend.routes.tasks import router as tasks_router
from backend.routes.graph import router as graph_router
from backend.routes.schedule import router as schedule_router
from backend.routes.decisions import router as decisions_router
from backend.routes.about import router as about_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    demo_mode = is_demo_mode()
    secret = os.getenv("PYJWT_SECRET") or os.getenv("JWT_SECRET")

    # When demo mode is off, refuse to start unless PYJWT_SECRET is set
    if not demo_mode and not secret:
        err_msg = (
            "CRITICAL STARTUP ERROR: PYJWT_SECRET environment variable is not configured.\n"
            "When demo mode is disabled (BLOCKSYNC_DEMO_MODE=false), BlockSync requires "
            "a secure JWT signing secret to operate.\n"
            "Set PYJWT_SECRET in your environment or .env file before starting the server."
        )
        sys.stderr.write(f"\n{"="*75}\n{err_msg}\n{"="*75}\n\n")
        raise RuntimeError(
            "PYJWT_SECRET environment variable must be set when demo mode is disabled."
        )

    if demo_mode and not secret:
        logger.warning(
            "DEMO MODE WARNING: Running in demo mode without PYJWT_SECRET. "
            "Seeded accounts and demo endpoints are enabled. Do not deploy to production with demo mode active."
        )

    # Initialize SQLite database with tasks and maintenance windows
    init_db()
    yield


app = FastAPI(
    title="BlockSync — Railway Maintenance Block Optimizer",
    description=(
        "Decision-support and optimization layer using Google OR-Tools CP-SAT "
        "for joint cross-department railway maintenance block scheduling."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for React frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API routers
app.include_router(auth_router)
app.include_router(tasks_router, tags=["Tasks & Optimization"])
app.include_router(graph_router, tags=["Graph Analysis"])
app.include_router(schedule_router, tags=["Schedules & Metrics"])
app.include_router(decisions_router, tags=["Human Decisions"])
app.include_router(about_router, tags=["About & Architecture"])


@app.get("/data/provenance")
def get_data_provenance():
    """Returns dataset provenance metadata, source classifications, record counts, and health status."""
    import json
    from pathlib import Path
    from backend.db import get_all_tasks, get_all_windows
    from optimizer.ml_priority import get_ml_priority_model

    meta_file = Path("data/metadata.json")
    if meta_file.exists():
        with open(meta_file, "r") as f:
            metadata = json.load(f)
    else:
        metadata = {"datasets": {}}

    live_tasks = get_all_tasks()
    live_windows = get_all_windows()
    ml_model = get_ml_priority_model()

    # Enrich metadata with live state
    if "maintenance_tasks" in metadata.get("datasets", {}):
        metadata["datasets"]["maintenance_tasks"]["record_count"] = len(live_tasks)
        metadata["datasets"]["maintenance_tasks"]["user_imported_count"] = max(0, len(live_tasks) - 9)
    if "maintenance_windows" in metadata.get("datasets", {}):
        metadata["datasets"]["maintenance_windows"]["record_count"] = len(live_windows)

    metadata["datasets"]["ml_priority_model"] = {
        "source": "synthetic_trained",
        "source_name": "Scikit-Learn RandomForest Priority Model",
        "methodology": "80/20 train/test validation on documented safety & delay escalation formula",
        "record_count": 1200,
        "last_updated": ml_model.training_metadata.get("last_trained", "2026-09-17"),
        "status": "active",
        "metrics": ml_model.metrics,
        "feature_importances": ml_model.feature_importances
    }

    return {
        "status": "healthy",
        "division": "Southern Railway · Tiruchirappalli Division (TPJ)",
        "datasets": metadata["datasets"],
        "corridor_analysis": metadata.get("corridor_analysis", {})
    }


@app.get("/")
def root():
    return {
        "app": "BlockSync Optimizer API",
        "version": "1.0.0",
        "status": "online",
        "division": "Southern Railway · Tiruchirappalli Division (TPJ)",
        "problem_id": "BLOCKSYNC-TPJ",
        "docs_url": "/docs",
        "endpoints": [
            "/auth/login",
            "/auth/accounts",
            "/auth/me",
            "/tasks",
            "/tasks/optimize",
            "/graph",
            "/schedule/baseline",
            "/schedule/optimize",
            "/schedule/weekly",
            "/data/provenance",
            "/metrics",
            "/decisions",
            "/about"
        ]
    }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
