"""PRIVATE ONLY: Portuguese episodes from AnimesDigital, matched to a MAL entry by title.

Unlicensed: enable only on an invite-only deployment (VIDEO_SOURCES=zoko,animesdigital).
Subtitles are burned into the video in Portuguese, and dubbed versions are separate titles
named "... Dublado". The chain is: search `/pesquisa/{query}/`, the title page
`/anime/a/{slug}` (episodes newest first, 50 per page), then each episode page
`/video/a/{id}`, whose player iframe is `api.anivideo.net/videohls.php?d=<HLS playlist>`.
The playlist hosts need no Referer.
"""

import asyncio
import html
import re
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from urllib.parse import parse_qs, quote, urlparse

import httpx
from cachetools import TTLCache

from app.sources.base import EpisodeList, Lang, Stream
from app.sources.matching import Candidate, mal_titles, match

BASE = "https://animesdigital.org"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
# Titles searched per entry: the main title first, then the English one.
MAX_QUERIES = 2
# The search wants the whole phrase, and the site names later seasons "X 2", so a sequel is
# also searched by its title without the season part.
SEASON = re.compile(
    r"\s*:?\s*(?:(\d+)(?:st|nd|rd|th)\s+season|season\s+(\d+)|part\s+(\d+))\s*$",
    re.IGNORECASE,
)
CACHE_TTL = 1800
# A title or episode that is not there yet may appear soon, so misses expire sooner.
MISS_TTL = 300
# Title list pages fetched at once for long shows.
PAGE_WIDTH = 6
# Upper bound on list pages, against a broken or hostile pagination.
MAX_PAGES = 60

RESULT = re.compile(
    r'<a href="'
    + re.escape(BASE)
    + r'/anime/a/([^"/]+)"[^>]*>.*?<span class="title_anime">([^<]*)</span>',
    re.DOTALL,
)
EPISODE = re.compile(
    r'<a href="(' + re.escape(BASE) + r'/video/a/[^"]+)"[^>]*>.*?'
    r'<img src="([^"]*)".*?<div class="title_anime">([^<]*)</div>',
    re.DOTALL,
)
# "Clannad Episódio 24"; specials and half episodes ("12.5") have no place in the numbering.
EPISODE_NUMBER = re.compile(r"\bepis[oó]dio\s+0*(\d+)\s*$", re.IGNORECASE)
PAGE_LINK = re.compile(r'href="([^"]+/page/)(\d+)/"')
PLAYER = re.compile(r'<iframe[^>]+src="\s*(https://api\.anivideo\.net/videohls\.php\?[^"]+)"')
# Dubbed titles end in "Dublado", sometimes after "PT-BR".
DUB_SUFFIX = re.compile(r"(?:\s+pt-br)?\s+dublado\s*$", re.IGNORECASE)


def parse_results(page: str) -> list[Candidate]:
    return [Candidate(slug, html.unescape(name).strip()) for slug, name in RESULT.findall(page)]


def is_dub(name: str) -> bool:
    return bool(DUB_SUFFIX.search(name))


def search_queries(detail: dict) -> list[str]:
    alt = detail.get("alternative_titles") or {}
    seen: list[str] = []
    for title in (detail.get("title"), alt.get("en")):
        if title and title not in seen:
            seen.append(title)
    queries = seen[:MAX_QUERIES] or sorted(mal_titles(detail))[:MAX_QUERIES]
    if queries and (stem := SEASON.sub("", queries[0])) and stem not in queries:
        queries.append(stem)
    return queries


async def find(
    detail: dict, fetch: Callable[[str], Awaitable[str]], lang: Lang
) -> Candidate | None:
    """The site's title for a MAL entry, in the subtitled or the dubbed version."""
    queries = search_queries(detail)
    pages = await asyncio.gather(*(fetch(f"{BASE}/pesquisa/{quote(q)}/") for q in queries))
    dub = lang == "dub"
    # A sequel only matches titles carrying its number, so the stem search can't pick an
    # earlier season when the site lacks this one.
    season = SEASON.search(detail.get("title") or "")
    number = next((n for n in season.groups() if n), None) if season else None
    numbered = re.compile(rf"\b{number}(?:st|nd|rd|th)?\b") if number else None
    # Pooled, since the stem query is not one of the MAL titles the matcher searches with.
    # Compared without the dub suffix, so both versions score like the original title.
    candidates = [
        Candidate(c.identifier, DUB_SUFFIX.sub("", c.name))
        for page in pages
        for c in parse_results(page)
        if is_dub(c.name) == dub and (numbered is None or numbered.search(c.name))
    ]
    return match(detail, lambda _query: candidates, lambda _slug: [])


@dataclass(frozen=True)
class Listing:
    source_title: str
    # Episode number -> episode page.
    pages: dict[int, str]
    thumbnails: dict[int, str]


def parse_episodes(page: str) -> list[tuple[int, str, str]]:
    """(number, episode page, image) for each numbered episode on one list page."""
    found = []
    for url, image, title in EPISODE.findall(page):
        if number := EPISODE_NUMBER.search(html.unescape(title).strip()):
            found.append((int(number.group(1)), url, image))
    return found


def page_links(page: str) -> list[str]:
    """Links to list pages 2..N, from the pagination's highest page number."""
    numbers = [(prefix, int(n)) for prefix, n in PAGE_LINK.findall(page)]
    if not numbers:
        return []
    prefix = numbers[0][0]
    last = min(max(n for _p, n in numbers), MAX_PAGES)
    return [f"{prefix}{n}/" for n in range(2, last + 1)]


def parse_player(page: str) -> str | None:
    """The HLS playlist the episode's player loads, or None when it only has other players."""
    if not (iframe := PLAYER.search(page)):
        return None
    target = parse_qs(urlparse(html.unescape(iframe.group(1))).query).get("d", [""])[0]
    return target if target.startswith("https://") else None


class AnimesDigitalSource:
    name = "animesdigital"

    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client or httpx.AsyncClient(
            headers={"User-Agent": USER_AGENT}, follow_redirects=True, timeout=15.0
        )
        self._listings: TTLCache[tuple, Listing | None] = TTLCache(maxsize=4096, ttl=CACHE_TTL)
        self._streams: TTLCache[tuple, Stream | None] = TTLCache(maxsize=4096, ttl=CACHE_TTL)
        # Misses (no match, no HLS player) live here instead, since they may change soon.
        self._recent: TTLCache[tuple, None] = TTLCache(maxsize=4096, ttl=MISS_TTL)
        # Listings being read, so concurrent callers (a title page, a fallback) share the work.
        self._inflight: dict[tuple, asyncio.Future[Listing | None]] = {}

    async def _get(self, url: str) -> str:
        response = await self._client.get(url)
        response.raise_for_status()
        return response.text

    async def _listing(self, anime: dict, lang: Lang) -> Listing | None:
        key = (anime["id"], lang)
        if key in self._listings:
            return self._listings[key]
        if key in self._recent:
            return None
        task = self._inflight.get(key)
        if task is None:
            task = self._inflight[key] = asyncio.ensure_future(self._read_listing(key, anime))
            task.add_done_callback(lambda t: self._settle(key, t))
        # Shielded: one caller giving up must not cancel the read the others wait on.
        return await asyncio.shield(task)

    def _settle(self, key: tuple, task: asyncio.Future[Listing | None]) -> None:
        self._inflight.pop(key, None)
        if not task.cancelled():
            task.exception()  # read it, so a read nobody waits on isn't left unretrieved

    async def _read_listing(self, key: tuple, anime: dict) -> Listing | None:
        listing = None
        if found := await find(anime, self._get, key[1]):
            first = await self._get(f"{BASE}/anime/a/{found.identifier}")
            limit = asyncio.Semaphore(PAGE_WIDTH)

            async def page(url: str) -> str:
                async with limit:
                    return await self._get(url)

            rest = await asyncio.gather(*(page(u) for u in page_links(first)))
            entries = [e for p in (first, *rest) for e in parse_episodes(p)]
            pages = {number: url for number, url, _image in reversed(entries)}
            # Most titles reuse their cover for every episode: only real stills are kept.
            images = {number: image for number, _url, image in entries}
            distinct = len(set(images.values())) > 1
            if pages:
                listing = Listing(
                    source_title=found.name,
                    pages=dict(sorted(pages.items())),
                    thumbnails={
                        n: i for n, i in images.items() if distinct and i.startswith("https://")
                    },
                )
        if listing is None:
            self._recent[key] = None
        else:
            self._listings[key] = listing
        return listing

    async def episodes(self, anime: dict, lang: Lang) -> EpisodeList | None:
        listing = await self._listing(anime, lang)
        if listing is None:
            return None
        return EpisodeList(list(listing.pages), listing.source_title, listing.thumbnails)

    async def stream(self, anime: dict, episode: int, lang: Lang) -> Stream | None:
        key = (anime["id"], episode, lang)
        if key in self._streams:
            return self._streams[key]
        if key in self._recent:
            return None
        listing = await self._listing(anime, lang)
        page = listing.pages.get(episode) if listing else None
        url = parse_player(await self._get(page)) if page else None
        result = Stream(url=url, kind="hls", resolution=None, upstream_headers={}) if url else None
        if result is None:
            self._recent[key] = None
        else:
            self._streams[key] = result
        return result
