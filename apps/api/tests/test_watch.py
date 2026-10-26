import httpx
import respx

from app.main import app as fastapi_app
from app.mal.client import API_BASE
from app.sources.base import EpisodeList, Stream
from tests.conftest import make_user

VIDEO_URL = "https://video.example/ep1.mp4"


class FakeSource:
    name = "fake"

    async def episodes(self, anime, lang):
        return EpisodeList(episodes=[1, 2, 3], source_title=anime["title"])

    async def stream(self, anime, episode, lang):
        if episode > 3:
            return None
        return Stream(
            url=VIDEO_URL,
            kind="mp4",
            resolution=1080,
            upstream_headers={"Referer": "https://source.example"},
        )


def mock_details():
    respx.get(f"{API_BASE}/anime/21").mock(
        return_value=httpx.Response(200, json={"id": 21, "title": "One Piece"})
    )


@respx.mock
async def test_episodes_and_playback_through_proxy(client, session):
    fastapi_app.state.sources = {"fake": FakeSource()}
    _, headers = await make_user(session, "kafka")
    mock_details()

    eps = await client.get("/watch/fake/21/episodes", headers=headers)
    assert eps.json() == {"source": "fake", "source_title": "One Piece", "episodes": [1, 2, 3]}

    play = await client.post("/watch/fake/21/episodes/1/play", headers=headers)
    assert play.status_code == 200
    url = play.json()["url"]
    assert url.startswith("/watch/video?token=")

    upstream = respx.get(VIDEO_URL).mock(
        return_value=httpx.Response(
            206, content=b"0123", headers={"content-range": "bytes 0-3/100", "content-length": "4"}
        )
    )
    # No Authorization header: the playback token in the URL is enough.
    video = await client.get(url, headers={"Range": "bytes=0-3"})
    assert video.status_code == 206
    assert video.content == b"0123"
    assert video.headers["content-range"] == "bytes 0-3/100"
    sent = upstream.calls.last.request
    assert sent.headers["range"] == "bytes=0-3"
    assert sent.headers["referer"] == "https://source.example"


async def test_video_proxy_rejects_missing_or_bad_tokens(client, session):
    fastapi_app.state.sources = {"fake": FakeSource()}
    assert (await client.get("/watch/video")).status_code == 422
    r = await client.get("/watch/video", params={"token": "garbage"})
    assert r.status_code == 401


async def test_access_token_cannot_be_used_as_playback_token(client, session):
    fastapi_app.state.sources = {"fake": FakeSource()}
    _, headers = await make_user(session, "kafka")
    access = headers["Authorization"].removeprefix("Bearer ")
    assert (await client.get("/watch/video", params={"token": access})).status_code == 401


@respx.mock
async def test_unknown_source_and_missing_episode(client, session):
    fastapi_app.state.sources = {"fake": FakeSource()}
    _, headers = await make_user(session, "kafka")
    mock_details()
    assert (await client.get("/watch/nope/21/episodes", headers=headers)).status_code == 404
    r = await client.post("/watch/fake/21/episodes/9/play", headers=headers)
    assert r.json()["error"]["code"] == "not_available"


async def test_no_sources_enabled_by_default(client, session):
    _, headers = await make_user(session, "kafka")
    assert (await client.get("/watch/sources", headers=headers)).json() == []


@respx.mock
async def test_video_proxy_passes_range_not_satisfiable_through(client, session):
    fastapi_app.state.sources = {"fake": FakeSource()}
    _, headers = await make_user(session, "kafka")
    mock_details()
    url = (await client.post("/watch/fake/21/episodes/1/play", headers=headers)).json()["url"]

    respx.get(VIDEO_URL).mock(
        return_value=httpx.Response(416, headers={"content-range": "bytes */100"})
    )
    video = await client.get(url, headers={"Range": "bytes=500-"})
    assert video.status_code == 416
    assert video.headers["content-range"] == "bytes */100"

    respx.get(VIDEO_URL).mock(return_value=httpx.Response(403))
    assert (await client.get(url)).status_code == 502


@respx.mock
async def test_nsfw_titles_cannot_be_listed_or_played_with_nsfw_off(client, session):
    fastapi_app.state.sources = {"fake": FakeSource()}
    _, normal = await make_user(session, "kafka")
    _, nsfw = await make_user(session, "friend", nsfw=True)
    respx.get(f"{API_BASE}/anime/21").mock(
        return_value=httpx.Response(200, json={"id": 21, "title": "Adult", "rating": "rx"})
    )
    r = await client.get("/watch/fake/21/episodes", headers=normal)
    assert r.json()["error"]["code"] == "anime_not_found"
    r = await client.post("/watch/fake/21/episodes/1/play", headers=normal)
    assert r.status_code == 404
    assert (await client.get("/watch/fake/21/episodes", headers=nsfw)).status_code == 200
