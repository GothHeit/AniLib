import asyncio
import logging
from collections.abc import Awaitable

from fastapi import APIRouter, Request

from app.deps import CurrentUser, Session
from app.errors import ApiError
from app.mal.client import MalClient, is_safe
from app.models import MalLink, WatchProgress
from app.routers.progress import latest_per_anime, to_out
from app.schemas import AnimeCard, HomeHero, HomeItem, HomeOut, HomeRow

router = APIRouter(tags=["home"])
log = logging.getLogger(__name__)

ROW_SIZE = 20


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


async def _hero(mal: MalClient, seasonal: list[dict]) -> HomeHero | None:
    """The best-scored title of the season that has a large picture."""
    candidates = [n for n in seasonal if (n.get("main_picture") or {}).get("large")]
    if not candidates:
        return None
    pick = max(candidates, key=lambda n: n.get("mean") or 0)
    details = await _soft(mal.details(pick["id"]), "hero details")
    pictures = [p.get("large") for p in (details or {}).get("pictures") or [] if p.get("large")]
    return HomeHero(
        anime=AnimeCard.from_node(pick),
        synopsis=(details or {}).get("synopsis"),
        backdrop=pictures[0] if pictures else pick["main_picture"]["large"],
    )


@router.get("/home", response_model=HomeOut)
async def home(
    request: Request,
    user: CurrentUser,
    session: Session,
):
    mal: MalClient = request.app.state.mal
    # The session isn't safe to share between tasks: read what the database holds first.
    progress = await latest_per_anime(session, user.id, ROW_SIZE)

    seasonal, top, continuing, my_list = await asyncio.gather(
        _soft(mal.seasonal(1, user.show_nsfw), "seasonal"),
        _soft(mal.top(user.show_nsfw), "top"),
        _continue_row(mal, progress, user.show_nsfw),
        _soft(_my_list_row(request, user, session), "my list"),
    )
    if seasonal is None and top is None:
        raise ApiError(502, "mal_unavailable", "MyAnimeList is unavailable")

    seasonal_nodes = [i["node"] for i in (seasonal or {}).get("data", [])]
    top_nodes = [i["node"] for i in (top or {}).get("data", [])]
    rows = [
        HomeRow(id="continue_watching", items=continuing),
        HomeRow(id="my_list", items=(my_list or [])),
        HomeRow(id="seasonal", items=_items(seasonal_nodes)),
        HomeRow(id="top", items=_items(top_nodes)),
    ]
    return HomeOut(hero=await _hero(mal, seasonal_nodes), rows=[r for r in rows if r.items])
