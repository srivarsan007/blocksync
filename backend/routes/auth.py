"""
Authentication Router — Seeded Railway Portal Accounts
Provides login verification and signed JWT session identity for Coordinator and Department desks.
"""

import os
import time
from typing import Dict, List
import jwt
from fastapi import APIRouter, HTTPException, Header, status

from backend.db import authenticate_user, get_user_by_username, is_demo_mode
from backend.models import LoginRequest, LoginResponse, UserSession

router = APIRouter(prefix="/auth", tags=["Authentication"])

JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    """
    Retrieves the JWT signing secret from the environment.
    If demo mode is enabled and no secret is set, uses an ephemeral development secret.
    If demo mode is disabled and no secret is set, raises an HTTPException.
    """
    secret = os.getenv("PYJWT_SECRET") or os.getenv("JWT_SECRET")
    if secret:
        return secret
    if is_demo_mode():
        return "blocksync-demo-mode-ephemeral-key"
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="PYJWT_SECRET environment variable is not configured."
    )


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest):
    """
    Authenticates fixed seeded railway credentials.
    Returns signed JWT session token and role identity for role-based portal routing.
    """
    user = authenticate_user(payload.username.strip(), payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid railway dispatch credentials. Please verify username and password."
        )

    # Generate signed JWT token containing standard operational payload fields
    timestamp = int(time.time())
    jwt_payload = {
        "username": user["username"],
        "role": user["role"],
        "timestamp": timestamp,
        "exp": timestamp + (24 * 3600)  # 24-hour expiration window
    }
    token = jwt.encode(jwt_payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

    return LoginResponse(
        token=token,
        username=user["username"],
        role=user["role"],
        department_name=user["department_name"],
        message=f"Welcome {user['department_name']}"
    )


@router.get("/accounts")
def list_available_accounts() -> List[Dict[str, str]]:
    """
    Returns list of seeded railway desks for dispatcher convenience.
    Only available when BLOCKSYNC_DEMO_MODE=true is explicitly set.
    """
    if not is_demo_mode():
        return []

    return [
        {
            "username": "coordinator_desk",
            "role": "coordinator",
            "portal": "Coordinator Portal",
            "department_name": "Central Traffic Control / Coordinator Desk",
            "default_hint": "coordinator123"
        },
        {
            "username": "engineering_desk",
            "role": "Engineering",
            "portal": "Requester Portal",
            "department_name": "Civil Engineering Department",
            "default_hint": "engineer123"
        },
        {
            "username": "snt_desk",
            "role": "S&T",
            "portal": "Requester Portal",
            "department_name": "Signal & Telecom (S&T) Department",
            "default_hint": "snt123"
        },
        {
            "username": "trd_desk",
            "role": "TRD",
            "portal": "Requester Portal",
            "department_name": "Traction Distribution (TRD) Department",
            "default_hint": "trd123"
        },
    ]


@router.get("/me", response_model=UserSession)
def get_current_user(authorization: str = Header(None)):
    """
    Returns the user profile decoded from active signed JWT session token.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing session authorization token."
        )

    token = authorization.strip()
    if token.startswith("Bearer "):
        token = token[7:].strip()

    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        username = payload.get("username")
        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload."
            )
        user = get_user_by_username(username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found."
            )
        return UserSession(
            id=user["id"],
            username=user["username"],
            role=user["role"],
            department_name=user["department_name"]
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token has expired. Please log in again."
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or forged JWT signature."
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed session token."
        )
