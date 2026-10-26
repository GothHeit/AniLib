import uuid
from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_session
from app.errors import ApiError
from app.models import User
from app.security import decode_access_token

Session = Annotated[AsyncSession, Depends(get_session)]

_bearer = HTTPBearer(auto_error=False)


async def current_user(
    session: Session,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    if credentials is None:
        raise ApiError(401, "not_authenticated", "Missing bearer token")
    decoded = decode_access_token(credentials.credentials)
    if decoded is None:
        raise ApiError(401, "invalid_token", "Invalid or expired token")
    user = await session.get(User, decoded[0])
    if user is None:
        raise ApiError(401, "invalid_token", "User no longer exists")
    return user


CurrentUser = Annotated[User, Depends(current_user)]


async def current_session_id(
    user: CurrentUser,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> uuid.UUID | None:
    """The login session the request belongs to; None for tokens that predate sessions."""
    decoded = decode_access_token(credentials.credentials) if credentials else None
    return decoded[1] if decoded else None


CurrentSessionId = Annotated[uuid.UUID | None, Depends(current_session_id)]


async def current_admin(user: CurrentUser) -> User:
    if not user.is_admin:
        raise ApiError(403, "forbidden", "Admins only")
    return user


CurrentAdmin = Annotated[User, Depends(current_admin)]


def client_ip(request: Request) -> str:
    if get_settings().trust_proxy_headers:
        forwarded = request.headers.get("x-forwarded-for", "")
        if forwarded:
            # The last hop is the one our own proxy appended; earlier ones are client-supplied.
            return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


ClientIp = Annotated[str, Depends(client_ip)]
