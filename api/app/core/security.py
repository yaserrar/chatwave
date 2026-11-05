from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt

from app.core.config import get_settings


def create_session_token(user_id: UUID) -> str:
    settings = get_settings()
    expires = datetime.now(timezone.utc) + timedelta(days=settings.session_max_age_days)
    return jwt.encode({"sub": str(user_id), "exp": expires}, settings.secret_key, algorithm="HS256")


def read_session_token(token: str) -> UUID | None:
    try:
        payload = jwt.decode(token, get_settings().secret_key, algorithms=["HS256"])
        return UUID(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError, TypeError):
        return None
