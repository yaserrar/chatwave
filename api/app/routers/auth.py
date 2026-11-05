from fastapi import APIRouter, Depends, Request, Response, HTTPException
from app.core.config import get_settings
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_current_user
from app.core.db import get_session
import secrets
from app.models import User
from app.core.security import read_session_token, create_session_token

router = APIRouter(tags=["auth"])


@router.post("/anonymous")
async def login(request: Request, session: AsyncSession = Depends(get_session)):
    session_token = request.cookies.get(get_settings().session_cookie_name)
    if session_token and read_session_token(session_token):
        user_id = read_session_token(session_token)
        if user_id:
            user = await session.get(User, user_id)
            return {"id": user.id, "name": user.name}

    new_user = User(name=f"Guest-{secrets.token_hex(2).upper()}")
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)

    session_token = create_session_token(str(new_user.id))
    response: Response = Response(
        content='{"message": "Logged in successfully", "user": {"id": "%s", "name": "%s"}}'
        % (new_user.id, new_user.name),
        media_type="application/json",
    )
    response.set_cookie(
        get_settings().session_cookie_name,
        session_token,
        httponly=True,
        samesite="lax",
        secure=get_settings().cookie_secure,
        max_age=7 * 86400,
        path="/",
    )
    return response


@router.get("/me")
async def me(request: Request, session: AsyncSession = Depends(get_session)):
    user = await get_current_user(request)

    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    return {"id": user.id, "name": user.name}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(get_settings().session_cookie_name, path="/")
    return {"message": "Logged out successfully"}
