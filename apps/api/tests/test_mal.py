from datetime import date

import httpx
import respx

from app.mal.client import API_BASE, current_season, filter_nsfw, rank_search_results
from tests.conftest import make_user


def test_current_season():
    assert current_season(date(2026, 1, 5)) == (2026, "winter")
    assert current_season(date(2026, 4, 1)) == (2026, "spring")
    assert current_season(date(2026, 8, 31)) == (2026, "summer")
    assert current_season(date(2026, 10, 26)) == (2026, "fall")


def test_nsfw_filter():
    items = [
        {"node": {"id": 1, "rating": "pg_13", "genres": [{"name": "Action"}]}},
        {"node": {"id": 2, "rating": "rx", "genres": []}},
        {"node": {"id": 3, "rating": "r", "genres": [{"name": "Ecchi"}]}},
    ]
    assert [i["node"]["id"] for i in filter_nsfw(items, False)] == [1]
    assert len(filter_nsfw(items, True)) == 3


def test_search_prefers_exact_title_over_popularity():
    items = [
        {"node": {"id": 1, "title": "Naruto: Shippuuden", "num_list_users": 3_000_000}},
        {"node": {"id": 2, "title": "Naruto", "num_list_users": 2_000_000}},
    ]
    assert rank_search_results("naruto", items)[0]["node"]["id"] == 2


@respx.mock
async def test_seasonal_uses_current_season_and_users_nsfw_setting(client, session):
    _, headers = await make_user(session, "kafka")
    year, season = current_season()
    route = respx.get(f"{API_BASE}/anime/season/{year}/{season}").mock(
        return_value=httpx.Response(200, json={"data": [], "paging": {}})
    )
    r = await client.get("/anime/seasonal", headers=headers)
    assert r.status_code == 200
    assert r.json()["season"] == season
    assert route.calls.last.request.url.params["nsfw"] == "false"


@respx.mock
async def test_mal_errors_become_clear_api_errors(client, session):
    _, headers = await make_user(session, "kafka")
    respx.get(f"{API_BASE}/anime/1").mock(return_value=httpx.Response(404))
    respx.get(f"{API_BASE}/anime/2").mock(return_value=httpx.Response(403, json={"error": "x"}))
    assert (await client.get("/anime/1", headers=headers)).json()["error"]["code"] == (
        "anime_not_found"
    )
    r = await client.get("/anime/2", headers=headers)
    assert r.status_code == 502
    assert r.json()["error"]["code"] == "mal_unavailable"


async def test_anime_routes_need_login(client):
    assert (await client.get("/anime/top")).status_code == 401


async def test_mal_callback_handles_denied_consent(client):
    r = await client.get("/mal/callback", params={"error": "access_denied", "state": "s"})
    assert r.status_code == 307
    assert r.headers["location"].endswith("/profile?mal=denied")


async def test_mal_callback_rejects_unknown_state(client):
    r = await client.get("/mal/callback", params={"code": "c", "state": "unknown"})
    assert r.headers["location"].endswith("/profile?mal=failed")
