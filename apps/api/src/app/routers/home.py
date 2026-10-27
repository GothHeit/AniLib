import asyncio
import logging
from collections.abc import Awaitable
from datetime import date

from fastapi import APIRouter, Request
from sqlalchemy import func, select

from app.deps import CurrentUser, Session
from app.errors import ApiError
from app.mal.client import MalClient, is_safe
from app.mal.genres import GENRE_IDS
from app.models import MalLink, WatchProgress
from app.routers.friends import sharing_friend_ids
from app.routers.progress import latest_per_anime, to_out
from app.schemas import AnimeCard, GenreOut, HomeHero, HomeItem, HomeOut, HomeRow

router = APIRouter(tags=["home"])
log = logging.getLogger(__name__)

ROW_SIZE = 20
HERO_COUNT = 5
# A shorter row looks broken, so genre and friends rows below this size are left out.
MIN_ROW = 8
GENRE_ROWS = 4
# Broad, family-safe genres, rotated by day so the home page isn't the same every visit.
GENRE_POOL = (1, 2, 4, 8, 10, 22, 24, 36, 30, 37, 7, 41)


async def _soft[T](work: Awaitable[T], what: str) -> T | None:
    """One failing section (MAL down, expired link) shouldn't blank the whole home page."""
    try:
        return await work
    except ApiError as exc:
        log.warning("home: %s unavailable: %s", what, exc.code)
    except ValueError as exc:  # e.g. a MAL token that TOKEN_ENCRYPTION_KEY can't decrypt
        log.warning("home: %s failed: %s", what, exc)
    return None


def _items(nodes: list[dict]) -> list[HomeItem]:
    return [HomeItem(anime=AnimeCard.from_node(n)) for n in nodes[:ROW_SIZE]]


async def _continue_row(
    mal: MalClient, rows: list[WatchProgress], allow_nsfw: bool
) -> list[HomeItem]:
    async def one(row: WatchProgress) -> HomeItem | None:
        anime = await _soft(mal.details(row.anime_id), f"details {row.anime_id}")
        if anime is None or (not allow_nsfw and not is_safe(anime)):
            return None
        card = AnimeCard.from_node(anime)
        if row.completed and card.num_episodes and row.episode >= card.num_episodes:
            return None  # finished the series
        return HomeItem(
            anime=card,
            progress=to_out(row),
            resume_episode=row.episode + 1 if row.completed else row.episode,
        )

    items = await asyncio.gather(*(one(r) for r in rows))
    return [i for i in items if i is not None]


async def _my_list_row(request: Request, user: CurrentUser, session: Session) -> list[HomeItem]:
    if await session.get(MalLink, user.id) is None:
        return []
    accounts = request.app.state.mal_accounts
    nodes: list[dict] = []
    for status in ("watching", "plan_to_watch"):
        result = await accounts.animelist(session, user, status)
        nodes.extend(i["node"] for i in result["data"])
    return _items(nodes)


def todays_genres(today: date, count: int = GENRE_ROWS) -> list[int]:
    start = (today.toordinal() * count) % len(GENRE_POOL)
    return [GENRE_POOL[(start + i) % len(GENRE_POOL)] for i in range(count)]


async def _genre_rows(mal: MalClient, allow_nsfw: bool) -> list[HomeRow]:
    """Most-followed titles of a few genres, drawn from the cached ranking pool."""
    pool = await mal.ranking_pool(allow_nsfw)
    rows = []
    for genre_id in todays_genres(date.today()):
        nodes = [n for n in pool if any(g.get("id") == genre_id for g in n.get("genres") or [])]
        info = GENRE_IDS[genre_id]
        if len(nodes) >= MIN_ROW:
            rows.append(
                HomeRow(
                    id="genre",
                    genre=GenreOut(id=info.id, name=info.name, kind=info.kind, nsfw=info.nsfw),
                    items=_items(nodes),
                )
            )
    return rows


async def _friends_popular_row(
    mal: MalClient, session: Session, user: CurrentUser
) -> list[HomeItem]:
    """Titles that friends who share their activity are watching, most friends first."""
    friends = await sharing_friend_ids(session, user.id)
    if not friends:
        return []
    watchers = func.count(func.distinct(WatchProgress.user_id))
    rows = await session.execute(
        select(WatchProgress.anime_id)
        .where(WatchProgress.user_id.in_(friends))
        .group_by(WatchProgress.anime_id)
        .order_by(watchers.desc(), func.max(WatchProgress.updated_at).desc())
        .limit(ROW_SIZE * 2)
    )
    ids = [r[0] for r in rows]

    async def card(anime_id: int) -> HomeItem | None:
        node = await _soft(mal.details(anime_id), f"details {anime_id}")
        if node is None or (not user.show_nsfw and not is_safe(node)):
            return None
        return HomeItem(anime=AnimeCard.from_node(node))

    items = [i for i in await asyncio.gather(*(card(a) for a in ids)) if i is not None]
    return items[:ROW_SIZE] if len(items) >= MIN_ROW else []


async def _heroes(mal: MalClient, seasonal: list[dict]) -> list[HomeHero]:
    """The best-scored titles of the season that have a large picture."""
    candidates = [n for n in seasonal if (n.get("main_picture") or {}).get("large")]
    picks = sorted(candidates, key=lambda n: n.get("mean") or 0, reverse=True)[:HERO_COUNT]

    async def one(pick: dict) -> HomeHero:
        details = await _soft(mal.details(pick["id"]), "hero details")
        pictures = [p.get("large") for p in (details or {}).get("pictures") or [] if p.get("large")]
        return HomeHero(
            anime=AnimeCard.from_node(pick),
            synopsis=(details or {}).get("synopsis"),
            backdrop=pictures[0] if pictures else pick["main_picture"]["large"],
        )

    return list(await asyncio.gather(*(one(p) for p in picks)))


@router.get("/home", response_model=HomeOut)
async def home(
    request: Request,
    user: CurrentUser,
    session: Session,
):
    mal: MalClient = request.app.state.mal
    # The session isn't safe to share between tasks: read what the database holds first.
    progress = await latest_per_anime(session, user.id, ROW_SIZE)

    friends_popular = await _friends_popular_row(mal, session, user)
    seasonal, top, continuing, my_list, genre_rows = await asyncio.gather(
        _soft(mal.seasonal(1, user.show_nsfw), "seasonal"),
        _soft(mal.top(user.show_nsfw), "top"),
        _continue_row(mal, progress, user.show_nsfw),
        _soft(_my_list_row(request, user, session), "my list"),
        _soft(_genre_rows(mal, user.show_nsfw), "genre rows"),
    )
    if seasonal is None and top is None:
        raise ApiError(502, "mal_unavailable", "MyAnimeList is unavailable")

    seasonal_nodes = [i["node"] for i in (seasonal or {}).get("data", [])]
    top_nodes = [i["node"] for i in (top or {}).get("data", [])]
    rows = [
        HomeRow(id="continue_watching", items=continuing),
        HomeRow(id="my_list", items=(my_list or [])),
        HomeRow(id="seasonal", items=_items(seasonal_nodes)),
        HomeRow(id="friends_popular", items=friends_popular),
        HomeRow(id="top", items=_items(top_nodes)),
        *(genre_rows or []),
    ]
    return HomeOut(heroes=await _heroes(mal, seasonal_nodes), rows=[r for r in rows if r.items])
