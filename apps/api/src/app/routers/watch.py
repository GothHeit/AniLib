import uuid
from typing import Annotated

import httpx
from fastapi import APIRouter, Query, Request
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

from app.deps import CurrentUser, Session
from app.errors import ApiError
from app.models import User
from app.security import create_playback_token, decode_playback_token
from app.sources.base import Lang, VideoSource

router = APIRouter(prefix="/watch", tags=["watch"])


class EpisodesOut(BaseModel):
    source: str
    source_title: str
    episodes: list[int]


class PlaybackOut(BaseModel):
    kind: str
    resolution: int | None
    # Relative to the API base URL. Carries a token scoped to this one episode, because
    # <video> and native players can't send an Authorization header.
    url: str


def _source(request: Request, name: str) -> VideoSource:
    source = request.app.state.sources.get(name)
    if source is None:
        raise ApiError(404, "source_not_found", f"Video source '{name}' is not enabled")
    return source


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
    src = _source(request, source)
    anime = await request.app.state.mal.visible_details(anime_id, user.show_nsfw)
    stream = await src.stream(anime, episode, lang)
    if stream is None:
        raise ApiError(404, "not_available", "This episode isn't available from this source")
    if stream.kind != "mp4":
        raise ApiError(501, "hls_not_supported", "HLS streams aren't supported yet")
    token = create_playback_token(user.id, source, anime_id, episode, lang)
    return PlaybackOut(
        kind=stream.kind, resolution=stream.resolution, url=f"/watch/video?token={token}"
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
