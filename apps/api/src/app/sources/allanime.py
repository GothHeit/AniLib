"""PRIVATE ONLY: episodes scraped from AllAnime via anipy-api.

AllAnime is unlicensed. This source must only be enabled on an invite-only deployment
(VIDEO_SOURCES=allanime) and never in a public one. Requires the `allanime` extra.
"""

import asyncio
import time
from collections.abc import Callable

from anipy_api.provider import LanguageTypeEnum
from anipy_api.provider.base import ProviderInfoResult
from anipy_api.provider.providers import AllAnimeProvider
from cachetools import TTLCache

from app.sources.base import EpisodeList, Lang, Stream
from app.sources.matching import Candidate, match

MAX_ATTEMPTS = 4
BASE_DELAY = 1.0
CACHE_TTL = 1800


class _SafeAllAnimeProvider(AllAnimeProvider):
    # AllAnime sometimes returns "show": null, which crashes get_info. One bad candidate
    # shouldn't break the whole match, so treat it as "no extra info".
    def get_info(self, identifier):
        try:
            return super().get_info(identifier)
        except (AttributeError, KeyError, TypeError):
            return ProviderInfoResult()


def with_retry[T](
    fn: Callable[..., T], *args, attempts: int = MAX_ATTEMPTS, base_delay: float = BASE_DELAY
) -> T:
    # The provider often answers 520 or empty bodies; backing off recovers most of them.
    for attempt in range(1, attempts + 1):
        try:
            return fn(*args)
        except Exception:
            if attempt == attempts:
                raise
            time.sleep(base_delay * 2 ** (attempt - 1))
    raise AssertionError("unreachable")


def _lang(lang: Lang) -> LanguageTypeEnum:
    return LanguageTypeEnum.DUB if lang == "dub" else LanguageTypeEnum.SUB


class AllAnimeSource:
    name = "allanime"

    def __init__(self) -> None:
        self._provider = _SafeAllAnimeProvider()
        self._matches: TTLCache[int, Candidate | None] = TTLCache(maxsize=4096, ttl=CACHE_TTL)
        self._episodes: TTLCache[tuple, EpisodeList] = TTLCache(maxsize=4096, ttl=CACHE_TTL)
        self._streams: TTLCache[tuple, Stream] = TTLCache(maxsize=4096, ttl=CACHE_TTL)

    def _search(self, query: str) -> list[Candidate]:
        results = with_retry(self._provider.get_search, query) or []
        return [Candidate(r.identifier, r.name) for r in results]

    def _alternative_names(self, identifier: str) -> list[str]:
        return list(self._provider.get_info(identifier).alternative_names or [])

    def _resolve(self, anime: dict) -> Candidate | None:
        key = anime["id"]
        if key not in self._matches:
            self._matches[key] = match(anime, self._search, self._alternative_names)
        return self._matches[key]

    def _episodes_sync(self, anime: dict, lang: Lang) -> EpisodeList | None:
        key = (anime["id"], lang)
        if key in self._episodes:
            return self._episodes[key]
        found = self._resolve(anime)
        if found is None:
            return None
        raw = with_retry(self._provider.get_episodes, found.identifier, _lang(lang))
        # Half episodes (12.5 recaps) are skipped; the player addresses whole numbers.
        episodes = sorted({int(e) for e in raw if float(e).is_integer()})
        result = EpisodeList(episodes=episodes, source_title=found.name)
        self._episodes[key] = result
        return result

    def _stream_sync(self, anime: dict, episode: int, lang: Lang) -> Stream | None:
        key = (anime["id"], episode, lang)
        if key in self._streams:
            return self._streams[key]
        found = self._resolve(anime)
        if found is None:
            return None
        streams = with_retry(self._provider.get_video, found.identifier, episode, _lang(lang))
        if not streams:
            return None
        best = max(streams, key=lambda s: s.resolution or 0)
        result = Stream(
            url=best.url,
            kind="hls" if ".m3u8" in best.url.lower() else "mp4",
            resolution=best.resolution,
            upstream_headers={"Referer": best.referrer} if best.referrer else {},
        )
        self._streams[key] = result
        return result

    # anipy-api is synchronous (requests), so run it off the event loop.
    async def episodes(self, anime: dict, lang: Lang) -> EpisodeList | None:
        return await asyncio.to_thread(self._episodes_sync, anime, lang)

    async def stream(self, anime: dict, episode: int, lang: Lang) -> Stream | None:
        return await asyncio.to_thread(self._stream_sync, anime, episode, lang)
