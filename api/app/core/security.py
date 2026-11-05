import jwt
from uuid import UUID
from app.core.config import get_settings
from datetime import datetime, timedelta


def create_session_token(user_id: str) -> str:
    expiration = datetime.utcnow() + timedelta(days=get_settings().session_max_age_days)
    payload = {"sub": user_id, "exp": expiration}
    token = jwt.encode(payload, get_settings().secret_key, algorithm="HS256")
    return token


def read_session_token(token: str) -> UUID | None:
    try:
        payload = jwt.decode(token, get_settings().secret_key, algorithms=["HS256"])
        return UUID(payload.get("sub"))
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
