"""Watch-together rooms, kept in memory.

A room is one episode watched in sync by up to MAX_MEMBERS people. It lives only as long as
someone is in it (plus a short grace period, so a page reload doesn't lose it), which is why
there is no table: the API runs as a single process.
"""

import asyncio
import secrets
import time
import uuid
from dataclasses import dataclass, field

from app.errors import ApiError

MAX_MEMBERS = 10
MAX_ROOMS = 100
MAX_ROOMS_PER_HOST = 3
# A host who drops (reload, network blip) keeps the room for this long before it passes on.
HOST_GRACE_SECONDS = 20
CODE_LENGTH = 6
# No 0/O or 1/I, so a code read aloud or from a screenshot can't be mistyped.
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
CHAT_HISTORY = 50
CHAT_MAX_LENGTH = 300
REACTIONS = ("👍", "❤️", "😂", "😮", "😢", "🔥")
EMPTY_GRACE_SECONDS = 60
MAX_EPISODE = 10_000

Event = tuple[str, dict]


@dataclass
class Member:
    username: str
    queues: set[asyncio.Queue[Event | None]] = field(default_factory=set)


@dataclass
class Room:
    code: str
    host_id: uuid.UUID
    source: str
    anime_id: int
    title: str
    episode: int
    lang: str
    locked: bool = False
    playing: bool = False
    # Where the video was at `moved_at` (monotonic seconds).
    position: float = 0.0
    moved_at: float = field(default_factory=time.monotonic)
    members: dict[uuid.UUID, Member] = field(default_factory=dict)
    votes: dict[uuid.UUID, int] = field(default_factory=dict)
    chat: list[dict] = field(default_factory=list)
    empty_since: float | None = field(default_factory=time.monotonic)

    def now_position(self) -> float:
        if not self.playing:
            return self.position
        return self.position + (time.monotonic() - self.moved_at)

    def playback(self, by: uuid.UUID | None = None) -> dict:
        return {
            "playing": self.playing,
            "position": round(self.now_position(), 2),
            "by": str(by) if by else None,
        }

    def snapshot(self) -> dict:
        return {
            "code": self.code,
            "host_id": str(self.host_id),
            "source": self.source,
            "anime_id": self.anime_id,
            "title": self.title,
            "episode": self.episode,
            "lang": self.lang,
            "locked": self.locked,
            "members": [{"id": str(i), "username": m.username} for i, m in self.members.items()],
            "votes": {str(user): episode for user, episode in self.votes.items()},
            "playback": self.playback(),
        }

    def broadcast(
        self, kind: str, data: dict, skip: asyncio.Queue[Event | None] | None = None
    ) -> None:
        for member in self.members.values():
            for queue in member.queues:
                if queue is not skip:
                    queue.put_nowait((kind, data))

    def _state(self) -> None:
        self.broadcast("state", self.snapshot())

    def is_full_for(self, user_id: uuid.UUID) -> bool:
        return user_id not in self.members and len(self.members) >= MAX_MEMBERS

    def join(self, user_id: uuid.UUID, username: str) -> asyncio.Queue[Event | None]:
        if self.is_full_for(user_id):
            raise ApiError(409, "room_full", "The room is full")
        queue: asyncio.Queue[Event | None] = asyncio.Queue()
        is_new = user_id not in self.members
        self.members.setdefault(user_id, Member(username)).queues.add(queue)
        self.empty_since = None
        queue.put_nowait(("state", self.snapshot()))
        for message in self.chat:
            queue.put_nowait(("chat", message))
        if is_new:
            self.broadcast("state", self.snapshot(), skip=queue)
        return queue

    def leave(self, user_id: uuid.UUID, queue: asyncio.Queue[Event | None]) -> None:
        member = self.members.get(user_id)
        if member is None:
            return
        member.queues.discard(queue)
        if member.queues:
            return
        del self.members[user_id]
        self.votes.pop(user_id, None)
        if not self.members:
            self.empty_since = time.monotonic()
            self.position = self.now_position()
            self.playing = False
            return
        if user_id == self.host_id:
            asyncio.get_running_loop().call_later(HOST_GRACE_SECONDS, self._pass_host, user_id)
        self._switch_if_majority()
        self._state()

    def _pass_host(self, former: uuid.UUID) -> None:
        # Only if the host never came back and someone is still here.
        if self.host_id != former or former in self.members or not self.members:
            return
        self.host_id = next(iter(self.members))
        self._state()

    def _switch_if_majority(self) -> None:
        tally: dict[int, int] = {}
        for episode in self.votes.values():
            tally[episode] = tally.get(episode, 0) + 1
        for episode, count in tally.items():
            if count * 2 > len(self.members):
                self._switch(episode)
                return

    def _require_member(self, user_id: uuid.UUID) -> None:
        if user_id not in self.members:
            raise ApiError(403, "not_in_room", "Join the room first")

    def control(self, user_id: uuid.UUID, action: str, position: float | None) -> None:
        self._require_member(user_id)
        if self.locked and user_id != self.host_id:
            raise ApiError(403, "controls_locked", "Only the host can control playback")
        at = self.now_position() if position is None else max(position, 0.0)
        if action == "play":
            self.playing = True
        elif action == "pause":
            self.playing = False
        self.position = at
        self.moved_at = time.monotonic()
        self.broadcast("playback", self.playback(user_id))

    def set_locked(self, user_id: uuid.UUID, locked: bool) -> None:
        if user_id != self.host_id:
            raise ApiError(403, "host_only", "Only the host can do this")
        self.locked = locked
        self._state()

    def _switch(self, episode: int) -> None:
        self.episode = episode
        self.votes.clear()
        self.playing = True
        self.position = 0.0
        self.moved_at = time.monotonic()
        self._state()

    def vote_episode(self, user_id: uuid.UUID, episode: int) -> None:
        """The host's pick applies at once; for anyone else it is a vote that needs a majority."""
        self._require_member(user_id)
        if not 0 <= episode <= MAX_EPISODE:
            raise ApiError(422, "invalid_episode", "Invalid episode")
        if user_id == self.host_id:
            self._switch(episode)
            return
        if episode == self.episode:
            return
        self.votes[user_id] = episode
        self._switch_if_majority()
        if self.votes:
            self._state()

    def withdraw_vote(self, user_id: uuid.UUID) -> None:
        self._require_member(user_id)
        if self.votes.pop(user_id, None) is not None:
            self._state()

    def say(self, user_id: uuid.UUID, text: str) -> None:
        self._require_member(user_id)
        text = text.strip()[:CHAT_MAX_LENGTH]
        if not text:
            raise ApiError(422, "empty_message", "Empty message")
        message = {
            "id": secrets.token_hex(6),
            "user_id": str(user_id),
            "username": self.members[user_id].username,
            "text": text,
            "reaction": False,
        }
        self.chat = [*self.chat, message][-CHAT_HISTORY:]
        self.broadcast("chat", message)

    def react(self, user_id: uuid.UUID, emoji: str) -> None:
        self._require_member(user_id)
        if emoji not in REACTIONS:
            raise ApiError(422, "invalid_reaction", "Unknown reaction")
        # Reactions are fleeting, so they are not kept for people who join later.
        self.broadcast(
            "chat",
            {
                "id": secrets.token_hex(6),
                "user_id": str(user_id),
                "username": self.members[user_id].username,
                "text": emoji,
                "reaction": True,
            },
        )


class Rooms:
    def __init__(self) -> None:
        self._rooms: dict[str, Room] = {}

    def get(self, code: str) -> Room:
        room = self._rooms.get(code.strip().upper())
        if room is None:
            raise ApiError(404, "room_not_found", "Room not found")
        return room

    def create(
        self, host_id: uuid.UUID, source: str, anime_id: int, title: str, episode: int, lang: str
    ) -> Room:
        hosted = sum(1 for r in self._rooms.values() if r.host_id == host_id)
        if len(self._rooms) >= MAX_ROOMS or hosted >= MAX_ROOMS_PER_HOST:
            raise ApiError(429, "too_many_rooms", "Too many rooms are open")
        code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))
        while code in self._rooms:
            code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))
        room = Room(code, host_id, source, anime_id, title, episode, lang)
        self._rooms[code] = room
        return room

    def sweep(self) -> None:
        """Drops rooms that have been empty past the grace period."""
        now = time.monotonic()
        for code, room in list(self._rooms.items()):
            if (
                not room.members
                and room.empty_since is not None
                and now - room.empty_since > EMPTY_GRACE_SECONDS
            ):
                del self._rooms[code]

    def __len__(self) -> int:
        return len(self._rooms)
