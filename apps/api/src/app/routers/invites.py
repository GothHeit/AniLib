from datetime import datetime, timedelta

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.db import utcnow
from app.deps import CurrentAdmin, Session
from app.models import Invite
from app.security import new_opaque_token

router = APIRouter(prefix="/invites", tags=["invites"])


class InviteIn(BaseModel):
    days_valid: int = Field(default=7, ge=1, le=90)


class InviteOut(BaseModel):
    code: str
    expires_at: datetime
    used: bool


def new_invite(days_valid: int, created_by=None) -> Invite:
    return Invite(
        code=new_opaque_token()[:24],
        created_by=created_by,
        expires_at=utcnow() + timedelta(days=days_valid),
    )


@router.post("", response_model=InviteOut, status_code=201)
async def create_invite(body: InviteIn, admin: CurrentAdmin, session: Session):
    invite = new_invite(body.days_valid, admin.id)
    session.add(invite)
    await session.commit()
    return InviteOut(code=invite.code, expires_at=invite.expires_at, used=False)


@router.get("", response_model=list[InviteOut])
async def list_invites(admin: CurrentAdmin, session: Session):
    rows = await session.scalars(select(Invite).order_by(Invite.created_at.desc()))
    return [
        InviteOut(code=i.code, expires_at=i.expires_at, used=i.used_at is not None) for i in rows
    ]
