"""The plug-in boundary for where video comes from.

The rest of the app (player, progress, UI) only talks to a VideoSource. Today the only
implementation is the private AllAnime scraper; a licensed catalog would be another one.
"""

from dataclasses import dataclass
from typing import Literal, Protocol

Lang = Literal["sub", "dub"]


@dataclass(frozen=True)
class EpisodeList:
    episodes: list[int]
    source_title: str


@dataclass(frozen=True)
class Subtitle:
    # BCP 47 code ("pt-BR", "en"); the player matches the user's preference against it.
    lang: str
    label: str
    url: str


@dataclass(frozen=True)
class Stream:
    url: str
    kind: Literal["mp4", "hls"]
    resolution: int | None
    # Headers the upstream host needs, e.g. a Referer for hotlink protection.
    upstream_headers: dict[str, str]
    subtitles: tuple[Subtitle, ...] = ()


class VideoSource(Protocol):
    name: str

    async def episodes(self, anime: dict, lang: Lang) -> EpisodeList | None:
        """`anime` is the MAL detail payload. None means the title isn't available."""
        ...

    async def stream(self, anime: dict, episode: int, lang: Lang) -> Stream | None: ...
