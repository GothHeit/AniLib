import asyncio

import respx

from app.main import app as fastapi_app
from app.sources.base import EpisodeList
from tests.conftest import make_user
from tests.mal_fixtures import mock_details, mock_ranking, mock_season, node


@respx.mock
async def test_seasonal_and_top_are_typed_and_flattened(client, session):
    _, headers = await make_user(session, "kafka")
    mock_season(node(1, "One", genres=[1]))
    mock_ranking(node(2, "Two"))

    seasonal = (await client.get("/anime/seasonal", headers=headers)).json()
    assert seasonal["data"][0]["id"] == 1
    assert seasonal["data"][0]["genres"] == [{"id": 1, "name": "g1"}]
    assert seasonal["has_next"] is False

    top = (await client.get("/anime/top", headers=headers)).json()
    assert [a["title"] for a in top["data"]] == ["Two"]


@respx.mock
async def test_list_responses_are_cached(client, session):
    _, headers = await make_user(session, "kafka")
    route = mock_ranking(node(2, "Two"))
    await client.get("/anime/top", headers=headers)
    await client.get("/anime/top", headers=headers)
    assert route.call_count == 1


async def test_genres_hide_nsfw_ones_by_default(client, session):
    _, normal = await make_user(session, "kafka")
    _, nsfw = await make_user(session, "friend", nsfw=True)
    names = {g["name"] for g in (await client.get("/anime/genres", headers=normal)).json()}
    assert "Action" in names and "Hentai" not in names
    names = {g["name"] for g in (await client.get("/anime/genres", headers=nsfw)).json()}
    assert "Hentai" in names


@respx.mock
async def test_browse_filters_by_genre_within_a_season(client, session):
    _, headers = await make_user(session, "kafka")
    mock_season(
        node(1, genres=[1]), node(2, genres=[4]), node(3, genres=[1, 4]), year=2025, season="fall"
    )
    r = await client.get(
        "/anime/browse", params={"genre": 1, "year": 2025, "season": "fall"}, headers=headers
    )
    body = r.json()
    assert [a["id"] for a in body["data"]] == [1, 3]
    assert body["page"] == 1 and body["has_next"] is False


@respx.mock
async def test_browse_pages_results(client, session):
    _, headers = await make_user(session, "kafka")
    mock_ranking(*(node(i) for i in range(1, 31)))
    first = (await client.get("/anime/browse", headers=headers)).json()
    assert len(first["data"]) == 24 and first["has_next"] is True
    second = (await client.get("/anime/browse", params={"page": 2}, headers=headers)).json()
    assert len(second["data"]) == 6 and second["has_next"] is False


@respx.mock
async def test_browse_a_whole_year_merges_its_seasons(client, session):
    _, headers = await make_user(session, "kafka")
    mock_season(node(1), year=2024, season="winter")
    mock_season(node(2), year=2024, season="spring")
    mock_season(node(1), node(3), year=2024, season="summer")
    mock_season(year=2024, season="fall")
    r = await client.get("/anime/browse", params={"year": 2024}, headers=headers)
    assert sorted(a["id"] for a in r.json()["data"]) == [1, 2, 3]


async def test_browse_validates_filters(client, session):
    _, headers = await make_user(session, "kafka")
    r = await client.get("/anime/browse", params={"season": "fall"}, headers=headers)
    assert r.status_code == 422
    r = await client.get("/anime/browse", params={"genre": 9999}, headers=headers)
    assert r.json()["error"]["code"] == "validation_failed"
    hentai = await client.get("/anime/browse", params={"genre": 12}, headers=headers)
    assert hentai.status_code == 422


@respx.mock
async def test_details_include_related_recommendations_and_sources(client, session):
    class Source:
        async def episodes(self, anime, lang):
            return EpisodeList(episodes=[1], source_title="x") if anime["id"] == 5 else None

    fastapi_app.state.sources = {"present": Source()}
    _, headers = await make_user(session, "kafka")
    mock_details(
        5,
        synopsis="Plot",
        related_anime=[
            {
                "node": node(6, "Sequel"),
                "relation_type": "sequel",
                "relation_type_formatted": "Sequel",
            }
        ],
        recommendations=[{"node": node(7, "Similar"), "num_recommendations": 12}],
    )
    mock_details(8)

    body = (await client.get("/anime/5", headers=headers)).json()
    assert body["synopsis"] == "Plot"
    assert body["related_anime"][0]["anime"]["title"] == "Sequel"
    assert body["recommendations"][0]["num_recommendations"] == 12
    assert body["available_sources"] == ["present"]

    assert (await client.get("/anime/8", headers=headers)).json()["available_sources"] == []


@respx.mock
async def test_details_of_nsfw_titles_are_hidden_unless_enabled(client, session):
    fastapi_app.state.sources = {}
    _, normal = await make_user(session, "kafka")
    _, nsfw = await make_user(session, "friend", nsfw=True)
    mock_details(9, rating="rx")
    r = await client.get("/anime/9", headers=normal)
    assert r.status_code == 404
    assert (await client.get("/anime/9", headers=nsfw)).status_code == 200


@respx.mock
async def test_a_failing_or_slow_source_is_skipped_and_remembered(client, session, monkeypatch):
    import app.routers.anime as anime_router

    monkeypatch.setattr(anime_router, "SOURCE_PROBE_TIMEOUT", 0.05)
    calls = {"broken": 0, "slow": 0}

    class Broken:
        async def episodes(self, anime, lang):
            calls["broken"] += 1
            raise RuntimeError("down")

    class Slow:
        async def episodes(self, anime, lang):
            calls["slow"] += 1
            await asyncio.sleep(5)

    fastapi_app.state.sources = {"broken": Broken(), "slow": Slow()}
    _, headers = await make_user(session, "kafka")
    mock_details(5)
    for _ in range(2):
        r = await client.get("/anime/5", headers=headers)
        assert r.status_code == 200
        assert r.json()["available_sources"] == []
    assert calls == {"broken": 1, "slow": 1}  # the second request used the cached failure
