from typing import Literal

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

from app.config import get_settings
from app.deps import CurrentUser, Session
from app.errors import ApiError
from app.mal.account import MalAccounts

router = APIRouter(tags=["mal"])

ListStatus = Literal["watching", "completed", "on_hold", "dropped", "plan_to_watch"]


class ListUpdate(BaseModel):
    status: ListStatus | None = None
    score: int | None = Field(default=None, ge=0, le=10)
    num_watched_episodes: int | None = Field(default=None, ge=0)


def _accounts(request: Request) -> MalAccounts:
    return request.app.state.mal_accounts


@router.get("/mal/link")
async def start_link(request: Request, user: CurrentUser, session: Session):
    return {"auth_url": await _accounts(request).authorize_url(session, user)}


@router.get("/mal/callback", include_in_schema=False)
async def callback(
    request: Request,
    session: Session,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
):
    # MAL sends `error` and no `code` when the user denies access.
    target = f"{get_settings().web_url}/profile"
    if error or not code or not state:
        return RedirectResponse(f"{target}?mal=denied")
    try:
        await _accounts(request).complete(session, code, state)
    except ApiError:
        return RedirectResponse(f"{target}?mal=failed")
    return RedirectResponse(f"{target}?mal=linked")


@router.get("/me/mal")
async def status(request: Request, user: CurrentUser, session: Session):
    return await _accounts(request).status(session, user)


@router.delete("/me/mal", status_code=204)
async def unlink(request: Request, user: CurrentUser, session: Session):
    await _accounts(request).disconnect(session, user)


@router.get("/me/animelist")
async def animelist(
    request: Request, user: CurrentUser, session: Session, status: ListStatus | None = None
):
    return await _accounts(request).animelist(session, user, status)


@router.patch("/me/animelist/{anime_id}")
async def update_entry(
    request: Request, anime_id: int, body: ListUpdate, user: CurrentUser, session: Session
):
    changes = body.model_dump(exclude_none=True)
    if not changes:
        raise ApiError(422, "validation_failed", "Nothing to update")
    return await _accounts(request).update_entry(session, user, anime_id, changes)


@router.delete("/me/animelist/{anime_id}", status_code=204)
async def remove_entry(request: Request, anime_id: int, user: CurrentUser, session: Session):
    await _accounts(request).remove_entry(session, user, anime_id)
