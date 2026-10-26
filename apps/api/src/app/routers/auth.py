from datetime import timedelta
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError

from app.config import get_settings
from app.db import utcnow
from app.deps import CurrentUser, Session
from app.errors import ApiError
from app.models import Invite, RefreshToken, User
from app.security import (
    DUMMY_PASSWORD_HASH,
    create_access_token,
    hash_password,
    new_opaque_token,
    sha256,
    verify_password,
)

router = APIRouter(tags=["auth"])

Locale = Literal["pt", "en"]


class RegisterIn(BaseModel):
    username: str = Field(pattern=r"^[A-Za-z0-9_]{3,32}$")
    password: str = Field(min_length=8, max_length=128)
    invite_code: str = Field(min_length=1, max_length=64)
    locale: Locale = "pt"


class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=32)
    password: str = Field(min_length=1, max_length=128)


class RefreshIn(BaseModel):
    refresh_token: str


class TokensOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int


class MeOut(BaseModel):
    id: str
    username: str
    locale: Locale
    show_nsfw: bool
    is_admin: bool


class MeUpdate(BaseModel):
    locale: Locale | None = None
    show_nsfw: bool | None = None


async def _issue_tokens(session: Session, user: User) -> TokensOut:
    settings = get_settings()
    refresh = new_opaque_token()
    session.add(
        RefreshToken(
            user_id=user.id,
            token_hash=sha256(refresh),
            expires_at=utcnow() + timedelta(days=settings.refresh_token_days),
        )
    )
    await session.commit()
    return TokensOut(
        access_token=create_access_token(user.id),
        refresh_token=refresh,
        expires_in=settings.access_token_minutes * 60,
    )


def _me(user: User) -> MeOut:
    return MeOut(
        id=str(user.id),
        username=user.username,
        locale=user.locale,
        show_nsfw=user.show_nsfw,
        is_admin=user.is_admin,
    )


@router.post("/auth/register", response_model=TokensOut, status_code=201)
async def register(body: RegisterIn, session: Session):
    invite = await session.scalar(
        select(Invite).where(Invite.code == body.invite_code).with_for_update()
    )
    if invite is None or invite.used_at is not None or invite.expires_at < utcnow():
        raise ApiError(400, "invalid_invite", "Invite code is invalid, used or expired")

    username = body.username.lower()
    if await session.scalar(select(User.id).where(User.username == username)):
        raise ApiError(409, "username_taken", "Username already taken")

    user = User(username=username, password_hash=hash_password(body.password), locale=body.locale)
    session.add(user)
    try:
        await session.flush()
    except IntegrityError:
        # Another request registered the same username between the check and the insert.
        await session.rollback()
        raise ApiError(409, "username_taken", "Username already taken") from None
    invite.used_by = user.id
    invite.used_at = utcnow()
    return await _issue_tokens(session, user)


@router.post("/auth/login", response_model=TokensOut)
async def login(body: LoginIn, session: Session):
    user = await session.scalar(select(User).where(User.username == body.username.lower()))
    password_hash = user.password_hash if user else DUMMY_PASSWORD_HASH
    if not verify_password(body.password, password_hash) or user is None:
        raise ApiError(401, "invalid_credentials", "Wrong username or password")
    return await _issue_tokens(session, user)


@router.post("/auth/refresh", response_model=TokensOut)
async def refresh(body: RefreshIn, session: Session):
    token = await session.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == sha256(body.refresh_token))
    )
    if token is None or token.expires_at < utcnow():
        raise ApiError(401, "invalid_refresh_token", "Refresh token is invalid or expired")

    if token.revoked_at is not None:
        # A revoked token being reused means it leaked: end every session for this user.
        await session.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == token.user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=utcnow())
        )
        await session.commit()
        raise ApiError(401, "invalid_refresh_token", "Refresh token was already used")

    token.revoked_at = utcnow()
    user = await session.get(User, token.user_id)
    if user is None:
        raise ApiError(401, "invalid_refresh_token", "User no longer exists")
    return await _issue_tokens(session, user)


@router.post("/auth/logout", status_code=204)
async def logout(body: RefreshIn, session: Session):
    await session.execute(
        update(RefreshToken)
        .where(
            RefreshToken.token_hash == sha256(body.refresh_token),
            RefreshToken.revoked_at.is_(None),
        )
        .values(revoked_at=utcnow())
    )
    await session.commit()


@router.get("/me", response_model=MeOut)
async def me(user: CurrentUser):
    return _me(user)


@router.patch("/me", response_model=MeOut)
async def update_me(body: MeUpdate, user: CurrentUser, session: Session):
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    await session.commit()
    return _me(user)
