import asyncio
from typing import Annotated, Literal

from cachetools import TLRUCache
from fastapi import APIRouter, Query, Request

from app.deps import CurrentUser
from app.errors import ApiError
from app.mal.client import MalClient
from app.mal.genres import GENRE_IDS, GENRES
from app.schemas import (
    AnimeCard,
    AnimeDetailsOut,
    AnimeListOut,
    BrowseOut,
    GenreOut,
    SeasonalOut,
)

router = APIRouter(prefix="/anime", tags=["anime"])

Season = Literal["winter", "spring", "summer", "fall"]

SOURCE_PROBE_TIMEOUT = 8.0
SOURCE_HINT_TTL = 900
SOURCE_FAILURE_TTL = 60


# Values are (found, ttl): failures are remembered too, but only briefly.
type SourceHints = TLRUCache[tuple[str, int], tuple[bool, float]]


def new_source_hints() -> SourceHints:
    return TLRUCache(maxsize=2048, ttu=lambda _key, value, now: now + value[1])


def _mal(request: Request) -> MalClient:
    return request.app.state.mal


def _cards(nodes: list[dict]) -> list[AnimeCard]:
    return [AnimeCard.from_node(n) for n in nodes]


@router.get("/seasonal", response_model=SeasonalOut)
async def seasonal(request: Request, user: CurrentUser, page: Annotated[int, Query(ge=1)] = 1):
    result = await _mal(request).seasonal(page, user.show_nsfw)
    return SeasonalOut(
        year=result["year"],
        season=result["season"],
        has_next=result["has_next"],
        data=_cards([i["node"] for i in result["data"]]),
    )


@router.get("/search", response_model=AnimeListOut)
async def search(
    request: Request, user: CurrentUser, q: Annotated[str, Query(min_length=1, max_length=100)]
):
    result = await _mal(request).search(q, user.show_nsfw)
    return AnimeListOut(data=_cards([i["node"] for i in result["data"]]))


@router.get("/top", response_model=AnimeListOut)
async def top(request: Request, user: CurrentUser):
    result = await _mal(request).top(user.show_nsfw)
    return AnimeListOut(data=_cards([i["node"] for i in result["data"]]))


@router.get("/genres", response_model=list[GenreOut])
async def genres(user: CurrentUser):
    return [
        GenreOut(id=g.id, name=g.name, kind=g.kind, nsfw=g.nsfw)
        for g in GENRES
        if user.show_nsfw or not g.nsfw
    ]


@router.get("/browse", response_model=BrowseOut)
async def browse(
    request: Request,
    user: CurrentUser,
    genre: Annotated[int | None, Query(description="MAL genre id, see /anime/genres")] = None,
    year: Annotated[int | None, Query(ge=1960, le=2100)] = None,
    season: Season | None = None,
    page: Annotated[int, Query(ge=1, le=50)] = 1,
):
    if season is not None and year is None:
        raise ApiError(422, "validation_failed", "season needs a year")
    if genre is not None:
        known = GENRE_IDS.get(genre)
        if known is None or (known.nsfw and not user.show_nsfw):
            raise ApiError(422, "validation_failed", "Unknown genre")
    nodes, has_next = await _mal(request).browse(genre, year, season, page, user.show_nsfw)
    return BrowseOut(data=_cards(nodes), page=page, has_next=has_next)


@router.get("/{anime_id}", response_model=AnimeDetailsOut)
async def details(request: Request, anime_id: int, user: CurrentUser):
    raw = await _mal(request).visible_details(anime_id, user.show_nsfw)

    # Related and recommended nodes carry no rating or genres, so they can't be filtered here;
    # opening one runs through the check above.
    out = AnimeDetailsOut.model_validate(
        {
            **raw,
            "related_anime": [{**r, "anime": r["node"]} for r in raw.get("related_anime") or []],
            "recommendations": [
                {**r, "anime": r["node"]} for r in raw.get("recommendations") or []
            ],
        }
    )
    out.available_sources = await _available_sources(request, raw)
    return out


async def _has_episodes(request: Request, name: str, anime: dict) -> bool:
    hints: SourceHints = request.app.state.source_hints
    key = (name, anime["id"])
    if key in hints:
        return hints[key][0]
    found = False
    ttl = SOURCE_HINT_TTL
    try:
        result = await asyncio.wait_for(
            request.app.state.sources[name].episodes(anime, "sub"), SOURCE_PROBE_TIMEOUT
        )
        found = bool(result and result.episodes)
    except Exception:  # a broken source just isn't offered
        ttl = SOURCE_FAILURE_TTL
    hints[key] = (found, ttl)
    return found


async def _available_sources(request: Request, anime: dict) -> list[str]:
    names = list(request.app.state.sources)
    hits = await asyncio.gather(*(_has_episodes(request, n, anime) for n in names))
    return [n for n, hit in zip(names, hits, strict=True) if hit]
