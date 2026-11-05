import secrets
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_session
from app.core.security import create_session_token, read_session_token
from app.dependencies import get_current_user
from app.models import User
from app.schemas.auth import UserOut

router = APIRouter(tags=["auth"])


@router.post("/anonymous", response_model=UserOut)
async def anonymous(request: Request, response: Response, session: AsyncSession = Depends(get_session)):
    settings = get_settings()

    # Already signed in (stale cache, second tab): return the existing guest.
    token = request.cookies.get(settings.session_cookie_name)
    existing_id = read_session_token(token) if token else None
    if existing_id:
        existing = await session.get(User, existing_id)
        if existing:
            return existing

    user = User(name=f"Guest-{secrets.token_hex(2).upper()}")
    session.add(user)
    await session.commit()
    await session.refresh(user)

    response.set_cookie(
        settings.session_cookie_name,
        create_session_token(user.id),
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        max_age=settings.session_max_age_days * 86400,
        path="/",
    )
    return user


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user


@router.post("/logout", status_code=204)
async def logout(response: Response):
    response.delete_cookie(get_settings().session_cookie_name, path="/")
