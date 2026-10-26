"""PRIVATE ONLY: episodes from the ZokoAnime embed player, addressed by MAL id.

Unlicensed, like AllAnime: enable only on an invite-only deployment (VIDEO_SOURCES=zoko).
Same chain as ani-cli's HiAnime provider, minus the title search: the embed URL is
`/stream/mal/{mal_id}/{episode}/{sub|dub}`, so no fuzzy matching is needed. The page ships
its config as `window.__P`, base64 of JSON XOR-ed with a fixed key, whose `src` is an HLS
master playlist. The playlist hosts demand the embed site as Referer.
"""

import base64
import json
import re

import httpx
from cachetools import TTLCache

from app.sources.base import EpisodeList, Lang, Stream, Subtitle

EMBED = "https://zokoanime.video"
KEY = b"otaku-embed-v1"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
BLOB = re.compile(r'window\.__P="([^"]*)"')
RESOLUTION = re.compile(r"RESOLUTION=\d+x(\d+)")
CACHE_TTL = 1800
# Upper bound when MAL doesn't know the episode count (long-running shows).
MAX_EPISODES = 2000


# The embed tags every track "en" in `lang`; the label is the only reliable hint.
LABEL_LANGS = {
    "english": "en",
    "portuguese": "pt-BR",
    "spanish": "es",
    "french": "fr",
    "german": "de",
    "italian": "it",
    "arabic": "ar",
    "russian": "ru",
    "indonesian": "id",
}


def parse_subtitles(raw: object) -> tuple[Subtitle, ...]:
    if not isinstance(raw, list):
        return ()
    tracks = []
    for item in raw:
        if not isinstance(item, dict) or not str(item.get("src", "")).startswith("https://"):
            continue
        label = str(item.get("label") or item.get("lang") or "")
        lang = LABEL_LANGS.get(label.lower(), "und")
        tracks.append(Subtitle(lang=lang, label=label, url=item["src"]))
    return tuple(tracks)


def decode_blob(blob: str) -> dict | None:
    try:
        raw = base64.b64decode(blob)
        text = bytes(b ^ KEY[i % len(KEY)] for i, b in enumerate(raw))
        data = json.loads(text)
    except ValueError:
        return None
    return data if isinstance(data, dict) else None


class ZokoSource:
    name = "zoko"

    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client or httpx.AsyncClient(
            headers={"User-Agent": USER_AGENT}, follow_redirects=True, timeout=15.0
        )
        self._streams: TTLCache[tuple, Stream | None] = TTLCache(maxsize=4096, ttl=CACHE_TTL)
        self._episodes: TTLCache[tuple, EpisodeList | None] = TTLCache(maxsize=4096, ttl=CACHE_TTL)

    async def _config(self, mal_id: int, episode: int, lang: Lang) -> dict | None:
        response = await self._client.get(f"{EMBED}/stream/mal/{mal_id}/{episode}/{lang}")
        if response.status_code == 404:
            return None
        response.raise_for_status()
        match = BLOB.search(response.text)
        # An unknown id or episode still answers 200, just without the config blob.
        return decode_blob(match.group(1)) if match else None

    async def _exists(self, mal_id: int, episode: int, lang: Lang) -> bool:
        config = await self._config(mal_id, episode, lang)
        return bool(config and config.get("src"))

    async def _last_episode(self, mal_id: int, lang: Lang, known: int) -> int:
        """Highest episode the player has. Episodes are contiguous, so probe by bisection."""
        if not await self._exists(mal_id, 1, lang):
            return 0
        low = 1
        if known:
            if await self._exists(mal_id, known, lang):
                return known
            high = known
        else:
            # Unknown length: double until the first miss, then bisect inside that gap.
            high = 2
            while high <= MAX_EPISODES and await self._exists(mal_id, high, lang):
                low, high = high, high * 2
        while high - low > 1:
            mid = (low + high) // 2
            if await self._exists(mal_id, mid, lang):
                low = mid
            else:
                high = mid
        return low

    async def episodes(self, anime: dict, lang: Lang) -> EpisodeList | None:
        key = (anime["id"], lang)
        if key not in self._episodes:
            last = await self._last_episode(anime["id"], lang, anime.get("num_episodes") or 0)
            self._episodes[key] = (
                EpisodeList(episodes=list(range(1, last + 1)), source_title=anime["title"])
                if last
                else None
            )
        return self._episodes[key]

    async def stream(self, anime: dict, episode: int, lang: Lang) -> Stream | None:
        key = (anime["id"], episode, lang)
        if key in self._streams:
            return self._streams[key]
        config = await self._config(anime["id"], episode, lang)
        src = config.get("src") if config else None
        result = None
        if isinstance(src, str) and src.startswith("https://"):
            result = Stream(
                url=src,
                kind="hls",
                resolution=await self._top_resolution(src),
                upstream_headers={"Referer": f"{EMBED}/"},
                subtitles=parse_subtitles(config.get("subtitles") if config else None),
            )
        if result is not None:
            self._streams[key] = result
        return result

    async def _top_resolution(self, master: str) -> int | None:
        try:
            response = await self._client.get(master, headers={"Referer": f"{EMBED}/"})
            heights = [int(h) for h in RESOLUTION.findall(response.text)]
        except httpx.HTTPError:
            return None
        return max(heights, default=None)
