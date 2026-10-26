from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

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
    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise ApiError(401, "invalid_token", "Invalid or expired token")
    user = await session.get(User, user_id)
    if user is None:
        raise ApiError(401, "invalid_token", "User no longer exists")
    return user


CurrentUser = Annotated[User, Depends(current_user)]


async def current_admin(user: CurrentUser) -> User:
    if not user.is_admin:
        raise ApiError(403, "forbidden", "Admins only")
    return user


CurrentAdmin = Annotated[User, Depends(current_admin)]
