import asyncio

import httpx
import respx

from app.main import app as fastapi_app
from app.sources.animesdigital import BASE, parse_results
from app.synopsis import PtSynopses, parse_synopsis
from tests.conftest import make_user
from tests.mal_fixtures import mock_details

SEARCH = """
<div class="itemA">
  <a href="https://animesdigital.org/anime/a/clannad" title="x" alt="x">
    <div class="thumb"><img src="a.jpg"></div>
    <div class="title"><span class="title_anime">Clannad</span></div>
  </a>
</div>
<div class="itemA">
  <a href="https://animesdigital.org/anime/a/clannad-after-story" title="x">
    <div class="title"><span class="title_anime">Clannad: After Story</span></div>
  </a>
</div>
"""
PAGE = (
    '<div class="sinopse">Okazaki Tomoya &eacute; um delinquente que acredita que '
    "<b>nunca</b> ser&aacute; nada.</div>"
)


def test_parse_results_reads_slug_and_name():
    results = parse_results(SEARCH)
    assert [(c.identifier, c.name) for c in results] == [
        ("clannad", "Clannad"),
        ("clannad-after-story", "Clannad: After Story"),
    ]


def test_parse_synopsis_strips_markup_and_entities():
    assert (
        parse_synopsis(PAGE) == "Okazaki Tomoya é um delinquente que acredita que nunca será nada."
    )


def test_parse_synopsis_ignores_missing_or_tiny_text():
    assert parse_synopsis("<p>none</p>") is None
    assert parse_synopsis('<div class="sinopse">curto</div>') is None


def _mock_site(search_body=SEARCH, page_body=PAGE):
    search = respx.get(url__regex=rf"{BASE}/pesquisa/.*").mock(
        return_value=httpx.Response(200, text=search_body)
    )
    page = respx.get(f"{BASE}/anime/a/clannad").mock(
        return_value=httpx.Response(200, text=page_body)
    )
    return search, page


@respx.mock
async def test_lookup_matches_the_title_and_caches():
    _, page = _mock_site()
    synopses = PtSynopses(httpx.AsyncClient())
    detail = {"id": 2167, "title": "Clannad"}
    text = await synopses.get(detail)
    assert text and text.startswith("Okazaki Tomoya")
    await synopses.get(detail)
    assert page.call_count == 1


@respx.mock
async def test_lookup_returns_none_when_nothing_matches():
    _mock_site()
    synopses = PtSynopses(httpx.AsyncClient())
    assert await synopses.get({"id": 1, "title": "Completely Different Show"}) is None


@respx.mock
async def test_lookup_returns_none_when_the_site_is_down():
    respx.get(url__regex=rf"{BASE}/pesquisa/.*").mock(return_value=httpx.Response(503))
    synopses = PtSynopses(httpx.AsyncClient())
    assert await synopses.get({"id": 1, "title": "Clannad"}) is None


@respx.mock
async def test_details_endpoint_prefers_portuguese_and_labels_the_language(client, session):
    _, headers = await make_user(session, "kafka")
    mock_details(2167, title="Clannad", synopsis="An English synopsis.")
    _mock_site()
    fastapi_app.state.pt_synopses = PtSynopses(httpx.AsyncClient())

    pt = (await client.get("/anime/2167?lang=pt", headers=headers)).json()
    assert pt["synopsis"].startswith("Okazaki Tomoya")
    assert pt["synopsis_lang"] == "pt"

    en = (await client.get("/anime/2167", headers=headers)).json()
    assert en["synopsis"] == "An English synopsis."
    assert en["synopsis_lang"] == "en"


@respx.mock
async def test_details_endpoint_falls_back_to_english(client, session):
    _, headers = await make_user(session, "kafka")
    mock_details(2167, title="Clannad", synopsis="An English synopsis.")
    respx.get(url__regex=rf"{BASE}/pesquisa/.*").mock(return_value=httpx.Response(503))
    fastapi_app.state.pt_synopses = PtSynopses(httpx.AsyncClient())

    body = (await client.get("/anime/2167?lang=pt", headers=headers)).json()
    assert body["synopsis"] == "An English synopsis."
    assert body["synopsis_lang"] == "en"


@respx.mock
async def test_details_endpoint_stays_english_and_offline_when_the_scraper_is_off(client, session):
    _, headers = await make_user(session, "kafka")
    mock_details(2167, title="Clannad", synopsis="An English synopsis.")
    site = respx.get(url__regex=rf"{BASE}/.*").mock(return_value=httpx.Response(200, text=PAGE))
    fastapi_app.state.pt_synopses = None

    body = (await client.get("/anime/2167?lang=pt", headers=headers)).json()
    assert body["synopsis"] == "An English synopsis."
    assert body["synopsis_lang"] == "en"
    assert not site.called


async def test_scraper_is_off_by_default(client):
    assert fastapi_app.state.pt_synopses is None


@respx.mock
async def test_unexpected_errors_fall_back_to_english(client, session, monkeypatch):
    _, headers = await make_user(session, "kafka")
    mock_details(2167, title="Clannad", synopsis="An English synopsis.")
    synopses = PtSynopses(httpx.AsyncClient())

    async def boom(_detail):
        raise ValueError("unexpected markup")

    monkeypatch.setattr(synopses, "_lookup", boom)
    fastapi_app.state.pt_synopses = synopses

    response = await client.get("/anime/2167?lang=pt", headers=headers)
    assert response.status_code == 200
    assert response.json()["synopsis_lang"] == "en"


@respx.mock
async def test_concurrent_lookups_share_one_scrape():
    search, page = _mock_site()
    synopses = PtSynopses(httpx.AsyncClient())
    detail = {"id": 2167, "title": "Clannad"}
    results = await asyncio.gather(synopses.get(detail), synopses.get(detail), synopses.get(detail))
    assert all(results)
    assert page.call_count == 1
    assert search.call_count == 1
