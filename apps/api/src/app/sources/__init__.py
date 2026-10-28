import logging

from app.sources.base import VideoSource

log = logging.getLogger(__name__)

# Sources that no longer exist. Skipped with a warning so an old VIDEO_SOURCES still boots.
RETIRED = {"allanime"}


def load_sources(names: list[str]) -> dict[str, VideoSource]:
    """Build the enabled sources. Imports are lazy so a public deployment never loads
    (or needs installed) a private source."""
    sources: dict[str, VideoSource] = {}
    for name in names:
        if name in RETIRED:
            log.warning("Video source %r was removed; drop it from VIDEO_SOURCES", name)
        elif name == "zoko":
            from app.sources.zoko import ZokoSource

            sources[name] = ZokoSource()
        else:
            raise ValueError(f"Unknown video source: {name}")
    return sources
