"""PRIVATE ONLY: the owner's own episode files, converted ahead of time into the local library
(see app.library and `python -m app.library ingest`).

Titles are folders named by MAL id, so no matching is needed. Links point at files under the
library folder; the HLS proxy serves them from disk to signed-in viewers only.
"""

import asyncio
from pathlib import Path

from app.library import (
    EPISODE_META,
    FONT_INDEX,
    FONTS_DIR,
    MASTER,
    THUMBNAIL,
    TITLE_META,
    read_json,
    title_dir,
)
from app.sources.base import EpisodeList, Lang, Skip, Stream, Subtitle


class LocalSource:
    name = "local"

    def __init__(self, root: Path):
        self.root = root

    def _episodes(self, mal_id: int, lang: Lang) -> EpisodeList | None:
        title = title_dir(self.root, mal_id, lang)
        meta = read_json(title / TITLE_META)
        if not isinstance(meta, dict):
            return None
        done = sorted(
            int(p.name)
            for p in title.iterdir()
            if p.name.isdigit() and (p / EPISODE_META).is_file()
        )
        if not done:
            return None
        return EpisodeList(
            episodes=done,
            source_title=str(meta.get("title", "")),
            thumbnails={
                ep: (title / str(ep) / THUMBNAIL).as_uri()
                for ep in done
                if (title / str(ep) / THUMBNAIL).is_file()
            },
        )

    def _stream(self, mal_id: int, episode: int, lang: Lang) -> Stream | None:
        title = title_dir(self.root, mal_id, lang)
        folder = title / str(episode)
        meta = read_json(folder / EPISODE_META)
        if not isinstance(meta, dict):
            return None
        fonts = read_json(title / FONT_INDEX) or {}
        return Stream(
            url=(folder / MASTER).as_uri(),
            kind="hls",
            resolution=meta.get("height"),
            upstream_headers={},
            subtitles=tuple(
                Subtitle(
                    lang=s["lang"],
                    label=s["label"],
                    url=(folder / s["vtt"]).as_uri(),
                    ass_url=(folder / s["ass"]).as_uri() if s.get("ass") else None,
                )
                for s in meta.get("subtitles", [])
            ),
            skips=tuple(
                Skip(kind=k["kind"], start=k["start"], end=k["end"]) for k in meta.get("skips", [])
            ),
            fonts={name: (title / FONTS_DIR / file).as_uri() for name, file in fonts.items()},
        )

    async def episodes(self, anime: dict, lang: Lang) -> EpisodeList | None:
        return await asyncio.to_thread(self._episodes, anime["id"], lang)

    async def stream(self, anime: dict, episode: int, lang: Lang) -> Stream | None:
        return await asyncio.to_thread(self._stream, anime["id"], episode, lang)
