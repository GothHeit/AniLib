import asyncio
import json
import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app import db
from app.deps import CurrentUser, Session
from app.errors import ApiError
from app.models import User
from app.rooms import REACTIONS, Room, Rooms
from app.routers.friends import UserSummary, friend_ids, summaries
from app.security import decode_access_token

router = APIRouter(prefix="/watch/rooms", tags=["rooms"])
_bearer = HTTPBearer(auto_error=False)

KEEPALIVE_SECONDS = 15


class RoomCreate(BaseModel):
    source: str = Field(min_length=1, max_length=40)
    anime_id: int = Field(ge=1)
    title: str = Field(min_length=1, max_length=200)
    episode: int = Field(ge=0, le=10_000)
    lang: Literal["sub", "dub"] = "sub"


class MemberOut(BaseModel):
    id: str
    username: str


class PlaybackOut(BaseModel):
    playing: bool
    position: float
    by: str | None = None


class RoomOut(BaseModel):
    code: str
    host_id: str
    source: str
    anime_id: int
    title: str
    episode: int
    lang: Literal["sub", "dub"]
    locked: bool
    members: list[MemberOut]
    # User id -> the episode they voted to switch to.
    votes: dict[str, int]
    playback: PlaybackOut


class ControlIn(BaseModel):
    action: Literal["play", "pause", "seek"]
    position: float | None = Field(default=None, ge=0, le=86_400)


class ChatIn(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


class ReactionIn(BaseModel):
    emoji: str = Field(max_length=16, description=f"One of {' '.join(REACTIONS)}")


class EpisodeIn(BaseModel):
    episode: int = Field(ge=0, le=10_000)


class InviteIn(BaseModel):
    user_id: uuid.UUID


class RoomInviteOut(BaseModel):
    code: str
    title: str
    episode: int
    anime_id: int
    inviter: UserSummary


class LockIn(BaseModel):
    locked: bool


def _room(request: Request, code: str) -> Room:
    rooms: Rooms = request.app.state.rooms
    return rooms.get(code)


@router.post("", response_model=RoomOut, status_code=201)
async def create_room(body: RoomCreate, request: Request, user: CurrentUser):
    if body.source not in request.app.state.sources:
        raise ApiError(404, "source_not_found", f"Video source '{body.source}' is not enabled")
    rooms: Rooms = request.app.state.rooms
    room = rooms.create(user.id, body.source, body.anime_id, body.title, body.episode, body.lang)
    return room.snapshot()


@router.get("/invites", response_model=list[RoomInviteOut])
async def my_invites(request: Request, user: CurrentUser, session: Session):
    """Rooms friends invited you to. Declared before /{code} so "invites" is not read as a code."""
    friends = set(await friend_ids(session, user.id))
    # An unfriended inviter's invite is gone with the friendship.
    pending = [(r, by) for r, by in request.app.state.rooms.invites_for(user.id) if by in friends]
    people = await summaries(session, list({by for _, by in pending}))
    return [
        RoomInviteOut(
            code=room.code,
            title=room.title,
            episode=room.episode,
            anime_id=room.anime_id,
            inviter=people[by],
        )
        for room, by in pending
        if by in people
    ]


@router.delete("/invites/{code}", status_code=204)
async def dismiss_invite(code: str, request: Request, user: CurrentUser):
    rooms: Rooms = request.app.state.rooms
    try:
        rooms.get(code).invited.pop(user.id, None)
    except ApiError:
        pass  # the room is already gone, which is what dismissing wanted


@router.get("/{code}", response_model=RoomOut)
async def get_room(code: str, request: Request, user: CurrentUser):
    room = _room(request, code)
    if room.is_full_for(user.id):
        raise ApiError(409, "room_full", "The room is full")
    return room.snapshot()


@router.post("/{code}/invite", status_code=204)
async def invite_friend(
    code: str, body: InviteIn, request: Request, user: CurrentUser, session: Session
):
    """Invites a friend to a room you are in. They see it next to their other notices."""
    room = _room(request, code)
    if body.user_id not in await friend_ids(session, user.id):
        raise ApiError(403, "invite_not_friends", "You can only invite friends")
    room.invite(user.id, body.user_id)


@router.post("/{code}/control", status_code=204)
async def control(code: str, body: ControlIn, request: Request, user: CurrentUser):
    _room(request, code).control(user.id, body.action, body.position)


@router.post("/{code}/chat", status_code=204)
async def chat(code: str, body: ChatIn, request: Request, user: CurrentUser):
    _room(request, code).say(user.id, body.text)


@router.post("/{code}/reaction", status_code=204)
async def reaction(code: str, body: ReactionIn, request: Request, user: CurrentUser):
    _room(request, code).react(user.id, body.emoji)


@router.post("/{code}/episode", status_code=204)
async def vote_episode(code: str, body: EpisodeIn, request: Request, user: CurrentUser):
    _room(request, code).vote_episode(user.id, body.episode)


@router.delete("/{code}/episode", status_code=204)
async def withdraw_vote(code: str, request: Request, user: CurrentUser):
    _room(request, code).withdraw_vote(user.id)


@router.put("/{code}/lock", status_code=204)
async def lock(code: str, body: LockIn, request: Request, user: CurrentUser):
    _room(request, code).set_locked(user.id, body.locked)


async def _stream_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    # Not CurrentUser: that holds a database connection until the response ends, and this
    # response lasts as long as the viewer stays in the room.
    if credentials is None:
        raise ApiError(401, "not_authenticated", "Missing bearer token")
    decoded = decode_access_token(credentials.credentials)
    if decoded is None:
        raise ApiError(401, "invalid_token", "Invalid or expired token")
    async with db.new_session() as session:
        user = await session.get(User, decoded[0])
    if user is None:
        raise ApiError(401, "invalid_token", "User no longer exists")
    return user


def _frame(kind: str, data: dict) -> str:
    return f"event: {kind}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.get("/{code}/events", response_class=StreamingResponse)
async def events(code: str, request: Request, user: Annotated[User, Depends(_stream_user)]):
    """Server-sent events: `state` (the whole room), `playback`, `chat`. Opening this joins the
    room; closing it leaves."""
    room = _room(request, code)
    if room.is_full_for(user.id):
        raise ApiError(409, "room_full", "The room is full")

    async def stream():
        queue = room.join(user.id, user.username)
        try:
            yield "retry: 3000\n\n"
            while True:
                try:
                    item = await asyncio.wait_for(queue.get(), KEEPALIVE_SECONDS)
                except TimeoutError:
                    yield ": keepalive\n\n"
                    continue
                if item is None:
                    return
                yield _frame(*item)
        finally:
            room.leave(user.id, queue)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"},
    )
