import httpx
import respx

from app.aniskip import API, pick_skips
from app.main import app as fastapi_app
from app.sources.base import Skip
from tests.conftest import make_user


def result(kind, start, end, length):
    return {
        "interval": {"startTime": start, "endTime": end},
        "skipType": kind,
        "skipId": "x",
        "episodeLength": length,
    }


def test_picks_the_closest_copy_per_kind_within_tolerance():
    results = [
        result("op", 1, 102, 1429.2),
        result("op", 5, 95, 1421.0),
        result("ed", 1280, 1370, 1400.5),  # a much shorter copy: its times would be off
        result("recap", 102, 160, 1425.0),
        result("mixed-op", 0, 90, 1420.0),  # not asked for
        result("op", "bad", 90, 1420.0),
    ]
    assert pick_skips(results, 1420.0) == [
        Skip("intro", 5.0, 95.0),
        Skip("recap", 102.0, 160.0),
    ]


def test_drops_intervals_past_the_end():
    assert pick_skips([result("ed", 1300, 1500, 1420)], 1420) == []


@respx.mock
async def test_skips_endpoint_filters_by_length_and_caches(client, session):
    _, headers = await make_user(session, "kafka")
    upstream = respx.get(f"{API}/20/1").mock(
        return_value=httpx.Response(
            200,
            json={
                "found": True,
                "results": [result("op", 1, 102, 1429.2), result("ed", 1280, 1370, 1400.5)],
            },
        )
    )
    r = await client.get("/watch/skips/20/1", params={"length": 1430}, headers=headers)
    assert r.json() == [{"kind": "intro", "start": 1.0, "end": 102.0}]
    r = await client.get("/watch/skips/20/1", params={"length": 1401}, headers=headers)
    assert r.json() == [{"kind": "outro", "start": 1280.0, "end": 1370.0}]
    assert upstream.call_count == 1
    sent = upstream.calls.last.request.url
    assert sent.params.get_list("types[]") == ["op", "ed", "recap"]


@respx.mock
async def test_no_times_or_a_failing_service_gives_no_skips(client, session):
    _, headers = await make_user(session, "kafka")
    respx.get(f"{API}/20/2").mock(
        return_value=httpx.Response(404, json={"found": False, "results": []})
    )
    respx.get(f"{API}/20/3").mock(side_effect=httpx.ConnectError("down"))
    for episode in (2, 3):
        r = await client.get(f"/watch/skips/20/{episode}", params={"length": 1400}, headers=headers)
        assert r.status_code == 200
        assert r.json() == []


async def test_skips_need_a_signed_in_user_and_a_length(client, session):
    assert (await client.get("/watch/skips/20/1", params={"length": 1400})).status_code == 401
    _, headers = await make_user(session, "kafka")
    assert (await client.get("/watch/skips/20/1", headers=headers)).status_code == 422
    assert fastapi_app.state.aniskip is not None
