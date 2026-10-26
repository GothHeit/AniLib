from app.sources.base import VideoSource


def load_sources(names: list[str]) -> dict[str, VideoSource]:
    """Build the enabled sources. Imports are lazy so a public deployment never loads
    (or needs installed) a private source."""
    sources: dict[str, VideoSource] = {}
    for name in names:
        if name == "allanime":
            from app.sources.allanime import AllAnimeSource

            sources[name] = AllAnimeSource()
        else:
            raise ValueError(f"Unknown video source: {name}")
    return sources
