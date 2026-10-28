"""Portuguese synopses from AnimesDigital, matched to a MyAnimeList entry by title.

Best effort: any failure, a title the site doesn't carry, or a slow answer gives None and the
caller keeps the English text. Results are cached in memory, misses for a day and errors briefly.
"""

import asyncio
import html
import logging
import re
from urllib.parse import quote

import httpx
from cachetools import TLRUCache

from app.sources.matching import Candidate, mal_titles, match

log = logging.getLogger(__name__)

BASE = "https://animesdigital.org"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
TIMEOUT = 6.0
FOUND_TTL = 7 * 86400
MISS_TTL = 86400
ERROR_TTL = 300
# Titles searched per entry: the main title first, then the English one.
MAX_QUERIES = 2
MIN_LENGTH = 40

RESULT = re.compile(
    r'<a href="'
    + re.escape(BASE)
    + r'/anime/a/([^"/]+)"[^>]*>.*?<span class="title_anime">([^<]*)</span>',
    re.DOTALL,
)
SYNOPSIS = re.compile(r'<div class="sinopse">(.*?)</div>', re.DOTALL)
TAG = re.compile(r"<[^>]+>")


def parse_results(page: str) -> list[Candidate]:
    return [Candidate(slug, html.unescape(name).strip()) for slug, name in RESULT.findall(page)]


def parse_synopsis(page: str) -> str | None:
    found = SYNOPSIS.search(page)
    if not found:
        return None
    text = " ".join(html.unescape(TAG.sub(" ", found.group(1))).split())
    return text if len(text) >= MIN_LENGTH else None


def _queries(detail: dict) -> list[str]:
    alt = detail.get("alternative_titles") or {}
    ordered = [detail.get("title"), alt.get("en")]
    seen: list[str] = []
    for title in ordered:
        if title and title not in seen:
            seen.append(title)
    return seen[:MAX_QUERIES] or sorted(mal_titles(detail))[:MAX_QUERIES]


class PtSynopses:
    def __init__(self, http: httpx.AsyncClient) -> None:
        self._http = http
        self._inflight: dict[int, asyncio.Future[str | None]] = {}
        # Values are (text or None, ttl).
        self._cache: TLRUCache[int, tuple[str | None, float]] = TLRUCache(
            maxsize=4096, ttu=lambda _key, value, now: now + value[1]
        )

    async def get(self, detail: dict) -> str | None:
        key = detail["id"]
        if (hit := self._cache.get(key)) is not None:
            return hit[0]
        # Concurrent requests for the same title (a cold home page) share one scrape.
        task = self._inflight.get(key)
        if task is None:
            task = self._inflight[key] = asyncio.ensure_future(self._fetch(key, detail))
            task.add_done_callback(lambda _t: self._inflight.pop(key, None))
        return await asyncio.shield(task)

    async def _fetch(self, key: int, detail: dict) -> str | None:
        try:
            async with asyncio.timeout(TIMEOUT):
                text = await self._lookup(detail)
        except Exception as exc:  # best effort: never let a scrape failure break the page
            log.warning("pt synopsis for %s unavailable: %s", key, exc)
            self._cache[key] = (None, ERROR_TTL)
            return None
        self._cache[key] = (text, FOUND_TTL if text else MISS_TTL)
        return text

    async def _get(self, url: str) -> str:
        response = await self._http.get(url, headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT)
        response.raise_for_status()
        return response.text

    async def _lookup(self, detail: dict) -> str | None:
        queries = _queries(detail)
        pages = await asyncio.gather(*(self._get(f"{BASE}/pesquisa/{quote(q)}/") for q in queries))
        results = {q: parse_results(page) for q, page in zip(queries, pages, strict=True)}
        best = match(detail, lambda q: results.get(q, []), lambda _slug: [])
        if best is None:
            return None
        return parse_synopsis(await self._get(f"{BASE}/anime/a/{best.identifier}"))
