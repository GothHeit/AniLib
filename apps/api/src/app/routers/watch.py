import logging
import uuid
from typing import Annotated
from urllib.parse import urljoin

import httpx
from fastapi import APIRouter, Query, Request
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

from app import hls
from app.deps import CurrentUser, Session
from app.errors import ApiError
from app.models import User
from app.security import create_playback_token, decode_playback_token
from app.sources.base import Lang, Stream, VideoSource

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/watch", tags=["watch"])


class EpisodesOut(BaseModel):
    source: str
    source_title: str
    episodes: list[int]


class SubtitleOut(BaseModel):
    lang: str
    label: str
    # Same-origin-friendly WebVTT link, signed like the HLS parts.
    url: str


class PlaybackOut(BaseModel):
    kind: str
    resolution: int | None
    # Relative to the API base URL. Carries a token scoped to this one episode, because
    # <video> and native players can't send an Authorization header.
    url: str
    subtitles: list[SubtitleOut] = []


def _source(request: Request, name: str) -> VideoSource:
    source = request.app.state.sources.get(name)
    if source is None:
        raise ApiError(404, "source_not_found", f"Video source '{name}' is not enabled")
    return source


async def _resolve_stream(
    request: Request, source: str, anime: dict, episode: int, lang: Lang
) -> tuple[str, Stream] | None:
    """The requested source first, then the other enabled ones, so one broken or missing
    source doesn't stop playback. Returns the name of the source that answered."""
    _source(request, source)
    names = [source] + [n for n in request.app.state.sources if n != source]
    failed = False
    for name in names:
        try:
            stream = await request.app.state.sources[name].stream(anime, episode, lang)
        except Exception:
            logger.exception("Source %s failed for MAL %s ep %s", name, anime.get("id"), episode)
            failed = True
            continue
        if stream is not None:
            return name, stream
    if failed:
        raise ApiError(502, "upstream_failed", "The video sources are failing right now")
    return None


@router.get("/sources", response_model=list[str])
async def sources(request: Request, user: CurrentUser):
    return list(request.app.state.sources)


@router.get("/{source}/{anime_id}/episodes", response_model=EpisodesOut)
async def episodes(
    request: Request, source: str, anime_id: int, user: CurrentUser, lang: Lang = "sub"
):
    src = _source(request, source)
    anime = await request.app.state.mal.visible_details(anime_id, user.show_nsfw)
    result = await src.episodes(anime, lang)
    if result is None:
        raise ApiError(404, "not_available", "This anime isn't available from this source")
    return EpisodesOut(source=source, source_title=result.source_title, episodes=result.episodes)


@router.post("/{source}/{anime_id}/episodes/{episode}/play", response_model=PlaybackOut)
async def play(
    request: Request,
    source: str,
    anime_id: int,
    episode: int,
    user: CurrentUser,
    lang: Lang = "sub",
):
    anime = await request.app.state.mal.visible_details(anime_id, user.show_nsfw)
    resolved = await _resolve_stream(request, source, anime, episode, lang)
    if resolved is None:
        raise ApiError(404, "not_available", "This episode isn't available from this source")
    used, stream = resolved
    token = create_playback_token(user.id, used, anime_id, episode, lang)
    path = "video" if stream.kind == "mp4" else "hls"
    referer = stream.upstream_headers.get("Referer", "")
    return PlaybackOut(
        kind=stream.kind,
        resolution=stream.resolution,
        url=f"/watch/{path}?token={token}",
        subtitles=[
            SubtitleOut(lang=s.lang, label=s.label, url=f"/watch/{hls.signed_link(s.url, referer)}")
            for s in stream.subtitles
        ],
    )


@router.get("/video")
async def video(request: Request, session: Session, token: Annotated[str, Query()]):
    claims = decode_playback_token(token)
    if claims is None or await session.get(User, uuid.UUID(claims["sub"])) is None:
        raise ApiError(401, "invalid_token", "Invalid or expired playback token")

    src = _source(request, claims["src"])
    anime = await request.app.state.mal.details(claims["aid"])
    stream = await src.stream(anime, claims["ep"], claims["lang"])
    if stream is None or stream.kind != "mp4":
        raise ApiError(404, "not_available", "This episode isn't available any more")

    headers = dict(stream.upstream_headers)
    if "range" in request.headers:
        headers["Range"] = request.headers["range"]  # lets the player seek

    http: httpx.AsyncClient = request.app.state.http
    upstream = await http.send(
        http.build_request(
            "GET", stream.url, headers=headers, timeout=httpx.Timeout(30.0, read=None)
        ),
        stream=True,
    )
    if upstream.status_code == 416:
        # A seek past the end: players expect the real 416 and the size in Content-Range.
        await upstream.aclose()
        return Response(
            status_code=416,
            headers={h: upstream.headers[h] for h in ("content-range",) if h in upstream.headers},
        )
    if upstream.status_code >= 400:
        await upstream.aclose()
        raise ApiError(502, "upstream_failed", f"Video host answered {upstream.status_code}")

    passthrough = {
        h: upstream.headers[h] for h in ("content-length", "content-range") if h in upstream.headers
    }
    passthrough["accept-ranges"] = "bytes"

    async def body():
        try:
            async for chunk in upstream.aiter_bytes():
                yield chunk
        finally:
            await upstream.aclose()

    return StreamingResponse(
        body(), status_code=upstream.status_code, media_type="video/mp4", headers=passthrough
    )


PLAYLIST_TIMEOUT = httpx.Timeout(15.0)
# Segments can be slow to start, but a host that goes quiet must not hold the connection.
SEGMENT_TIMEOUT = httpx.Timeout(30.0, read=60.0)


async def _open_upstream(
    http: httpx.AsyncClient, url: str, headers: dict[str, str]
) -> tuple[httpx.Response, str]:
    """GET a URL from a third-party host. Playlist hosts are untrusted, so every hop
    (redirects included) must be a public address, never something on our own network."""
    for _ in range(hls.MAX_REDIRECTS + 1):
        if not await hls.is_public_target(url):
            raise ApiError(502, "upstream_failed", "Refused to fetch a non-public address")
        timeout = PLAYLIST_TIMEOUT if hls.is_playlist(url, "") else SEGMENT_TIMEOUT
        upstream = await http.send(
            http.build_request("GET", url, headers=headers, timeout=timeout),
            stream=True,
            follow_redirects=False,
        )
        location = upstream.headers.get("location")
        if upstream.status_code not in (301, 302, 303, 307, 308) or not location:
            return upstream, url
        await upstream.aclose()
        url = urljoin(url, location)
    raise ApiError(502, "upstream_failed", "Too many redirects from the video host")


async def _read_playlist(upstream: httpx.Response) -> str:
    chunks: list[bytes] = []
    size = 0
    try:
        async for chunk in upstream.aiter_bytes():
            size += len(chunk)
            if size > hls.MAX_PLAYLIST_BYTES:
                raise ApiError(502, "upstream_failed", "Playlist from the video host is too large")
            chunks.append(chunk)
    finally:
        await upstream.aclose()
    return b"".join(chunks).decode("utf-8", errors="replace")


@router.get("/hls")
async def hls_proxy(
    request: Request,
    session: Session,
    token: Annotated[str | None, Query()] = None,
    u: Annotated[str | None, Query()] = None,
    r: Annotated[str, Query()] = "",
    e: Annotated[int, Query()] = 0,
    s: Annotated[str, Query()] = "",
):
    """Without `u`, the master playlist of the episode the token is for. With `u`, one
    playlist, segment or subtitle that an earlier response linked to (signed)."""
    if u is None:
        claims = decode_playback_token(token) if token else None
        if claims is None or await session.get(User, uuid.UUID(claims["sub"])) is None:
            raise ApiError(401, "invalid_token", "Invalid or expired playback token")
        src = _source(request, claims["src"])
        anime = await request.app.state.mal.details(claims["aid"])
        stream = await src.stream(anime, claims["ep"], claims["lang"])
        if stream is None or stream.kind != "hls":
            raise ApiError(404, "not_available", "This episode isn't available any more")
        url, referer = stream.url, stream.upstream_headers.get("Referer", "")
    else:
        if not hls.verify_link(u, r, e, s):
            raise ApiError(401, "invalid_token", "Invalid or expired stream link")
        url, referer = u, r

    headers = {"Referer": referer} if referer else {}
    if "range" in request.headers:
        headers["Range"] = request.headers["range"]
    http: httpx.AsyncClient = request.app.state.http
    upstream, url = await _open_upstream(http, url, headers)
    if upstream.status_code >= 400 and upstream.status_code != 416:
        await upstream.aclose()
        raise ApiError(502, "upstream_failed", f"Video host answered {upstream.status_code}")

    content_type = upstream.headers.get("content-type", "")
    if hls.is_playlist(url, content_type):
        text = await _read_playlist(upstream)
        return Response(
            hls.rewrite_playlist(text, str(upstream.url), referer),
            media_type="application/vnd.apple.mpegurl",
            headers={"cache-control": "no-store"},
        )

    # Segments are often disguised as images; players need to see them as video.
    media_type = "text/vtt" if url.split("?")[0].endswith(".vtt") else "video/mp2t"
    passthrough = {
        h: upstream.headers[h] for h in ("content-length", "content-range") if h in upstream.headers
    }
    passthrough["accept-ranges"] = "bytes"

    async def body():
        try:
            async for chunk in upstream.aiter_bytes():
                yield chunk
        finally:
            await upstream.aclose()

    return StreamingResponse(
        body(), status_code=upstream.status_code, media_type=media_type, headers=passthrough
    )
