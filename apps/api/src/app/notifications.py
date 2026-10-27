import asyncio
import logging
import uuid
from datetime import timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import new_session, utcnow
from app.mal.client import MalClient, is_safe
from app.models import (
    ContinueHidden,
    EpisodeSeen,
    Notification,
    NotificationMute,
    User,
    WatchProgress,
)
from app.sources.base import VideoSource

log = logging.getLogger(__name__)

KINDS = ("friend_request", "friend_accepted", "room_invite", "new_episode")
RETENTION = timedelta(days=30)

# Only titles someone watched lately are checked for new episodes.
WATCH_WINDOW = timedelta(days=90)
MAX_TITLES_PER_RUN = 300
CHECK_CONCURRENCY = 4
SOURCE_TIMEOUT_SECONDS = 20


async def notify(
    session: AsyncSession,
    user_id: uuid.UUID,
    kind: str,
    *,
    actor_id: uuid.UUID | None = None,
    anime_id: int | None = None,
    episode: int | None = None,
    title: str | None = None,
    room_code: str | None = None,
) -> None:
    """Adds a notification to the session (the caller commits), unless the user muted the kind.

    A repeat about the same subject replaces the earlier one, so asking twice or catching up on
    several episodes leaves one entry."""
    if await session.get(NotificationMute, (user_id, kind)) is not None:
        return
    await _forget(session, user_id, kind, actor_id, anime_id, room_code)
    session.add(
        Notification(
            user_id=user_id,
            kind=kind,
            actor_id=actor_id,
            anime_id=anime_id,
            episode=episode,
            title=title,
            room_code=room_code,
        )
    )


async def _forget(
    session: AsyncSession,
    user_id: uuid.UUID,
    kind: str,
    actor_id: uuid.UUID | None,
    anime_id: int | None,
    room_code: str | None,
) -> None:
    await session.execute(
        delete(Notification).where(
            Notification.user_id == user_id,
            Notification.kind == kind,
            Notification.actor_id.is_not_distinct_from(actor_id),
            Notification.anime_id.is_not_distinct_from(anime_id),
            Notification.room_code.is_not_distinct_from(room_code),
        )
    )


async def withdraw(
    session: AsyncSession, user_id: uuid.UUID, kind: str, actor_id: uuid.UUID
) -> None:
    """Removes a notification that no longer applies, e.g. a friend request that was taken back."""
    await _forget(session, user_id, kind, actor_id, None, None)


async def purge_old(session: AsyncSession) -> None:
    await session.execute(
        delete(Notification).where(Notification.created_at < utcnow() - RETENTION)
    )


# ---------------------------------------------------------------- new episodes


async def _latest_episode(sources: dict[str, VideoSource], anime: dict) -> int | None:
    """The newest episode the first source that knows the title has."""
    for source in sources.values():
        try:
            found = await asyncio.wait_for(source.episodes(anime, "sub"), SOURCE_TIMEOUT_SECONDS)
        except Exception as exc:  # a broken source just isn't consulted
            log.warning("notifications: %s failed for %s: %s", source.name, anime["id"], exc)
            continue
        if found and found.episodes:
            return max(found.episodes)
    return None


async def _check_title(mal: MalClient, sources: dict[str, VideoSource], anime_id: int) -> None:
    anime = await mal.details(anime_id)
    if anime.get("status") != "currently_airing":
        return
    latest = await _latest_episode(sources, anime)
    if latest is None:
        return
    async with new_session() as session:
        seen = await session.get(EpisodeSeen, anime_id)
        if seen is None:
            # First look: remember where the title is without announcing what already exists.
            session.add(EpisodeSeen(anime_id=anime_id, latest_episode=latest))
            await session.commit()
            return
        seen.checked_at = utcnow()
        if latest <= seen.latest_episode:
            await session.commit()
            return
        seen.latest_episode = latest
        title = (anime.get("title") or "")[:300]
        watchers = await session.execute(
            select(
                WatchProgress.user_id,
                func.max(WatchProgress.episode),
                func.max(WatchProgress.updated_at),
            )
            .where(WatchProgress.anime_id == anime_id)
            .group_by(WatchProgress.user_id)
        )
        cutoff = utcnow() - WATCH_WINDOW
        for user_id, furthest, last_watched in watchers.all():
            if furthest >= latest or last_watched < cutoff:
                continue
            user = await session.get(User, user_id)
            if user is None or (not user.show_nsfw and not is_safe(anime)):
                continue
            hidden = await session.get(ContinueHidden, (user_id, anime_id))
            if hidden is not None and hidden.hidden_at >= last_watched:
                continue
            await notify(
                session, user_id, "new_episode", anime_id=anime_id, episode=latest, title=title
            )
        await session.commit()


async def check_new_episodes(mal: MalClient, sources: dict[str, VideoSource]) -> None:
    """Tells people who are watching an airing title that it has a new episode."""
    async with new_session() as session:
        await purge_old(session)
        await session.commit()
    if not sources:
        return
    async with new_session() as session:
        ids = list(
            await session.scalars(
                select(WatchProgress.anime_id)
                .where(WatchProgress.updated_at > utcnow() - WATCH_WINDOW)
                .group_by(WatchProgress.anime_id)
                .order_by(func.max(WatchProgress.updated_at).desc())
                .limit(MAX_TITLES_PER_RUN)
            )
        )
    gate = asyncio.Semaphore(CHECK_CONCURRENCY)

    async def one(anime_id: int) -> None:
        async with gate:
            try:
                await _check_title(mal, sources, anime_id)
            except Exception as exc:
                log.warning("notifications: could not check %s: %s", anime_id, exc)

    await asyncio.gather(*(one(i) for i in ids))
