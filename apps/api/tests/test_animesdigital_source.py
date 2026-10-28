from urllib.parse import unquote

import httpx
import respx

from app.sources import load_sources
from app.sources.animesdigital import (
    BASE,
    AnimesDigitalSource,
    find,
    page_links,
    parse_episodes,
    parse_player,
    search_queries,
)

SEARCH = """
<a href="https://animesdigital.org/anime/a/clannad-2" title="x">
  <span class="title_anime">Clannad Dublado</span></a>
<a href="https://animesdigital.org/anime/a/clannad" title="x">
  <span class="title_anime">Clannad</span></a>
<a href="https://animesdigital.org/anime/a/clannad-after-story" title="x">
  <span class="title_anime">Clannad After Story</span></a>
"""


def item(number: int | str, slug: str = "", image: str = "https://img/cover.jpg") -> str:
    return f"""
    <div class="item_ep b_flex">
      <a href="{BASE}/video/a/{slug or number}/" class="b_flex">
        <div class="thumb"><img src="{image}" alt="x"></div>
        <div class="left"><div class="title_anime">Clannad Epis&oacute;dio {number}</div></div>
      </a>
    </div>"""


def listing(numbers: range, pages: int = 0) -> str:
    links = "".join(
        f'<li><a href="{BASE}/anime/a/cl001/page/{n}/">{n}</a></li>' for n in range(2, pages + 1)
    )
    return (
        "".join(item(n) for n in reversed(numbers)) + f'<ul class="content-pagination">{links}</ul>'
    )


def player(episode: int) -> str:
    hls = f"https://cdn.example/stream/c/clannad/{episode:02}.mp4/index.m3u8"
    return (
        f'<iframe class="metaframe" src="https://api.anivideo.net/videohls.php?d={hls}'
        '&nocache1793169114" frameborder="0"></iframe>'
        f'<iframe class="metaframe" src="{BASE}/aHR0cHM=/22/bg.mp4?p=2"></iframe>'
    )


ANIME = {"id": 2167, "title": "Clannad", "num_episodes": 23}


SUB = listing(range(1, 24))
DUB = listing(range(1, 13))


def mock_site(sub: str = SUB, dub: str = DUB):
    respx.get(url__regex=rf"{BASE}/pesquisa/.*").mock(return_value=httpx.Response(200, text=SEARCH))
    sub_page = respx.get(f"{BASE}/anime/a/clannad").mock(return_value=httpx.Response(200, text=sub))
    respx.get(f"{BASE}/anime/a/clannad-2").mock(return_value=httpx.Response(200, text=dub))
    respx.get(url__regex=rf"{BASE}/video/a/\d+/").mock(
        side_effect=lambda r: httpx.Response(200, text=player(int(r.url.path.split("/")[-2])))
    )
    return sub_page


def test_parse_episodes_skips_unnumbered_entries():
    page = item(2) + item("1") + item("Especial", slug="99") + item("12.5", slug="98")
    assert [(n, url) for n, url, _img in parse_episodes(page)] == [
        (2, f"{BASE}/video/a/2/"),
        (1, f"{BASE}/video/a/1/"),
    ]


def test_page_links_cover_every_page_up_to_the_last():
    page = listing(range(1, 3), pages=4).replace('/page/3/">3', '/page/x/">...')
    assert page_links(page) == [f"{BASE}/anime/a/cl001/page/{n}/" for n in (2, 3, 4)]
    assert page_links("<ul></ul>") == []


def test_parse_player_reads_the_hls_playlist():
    assert parse_player(player(7)) == "https://cdn.example/stream/c/clannad/07.mp4/index.m3u8"
    assert parse_player('<iframe src="https://blogger.example/x"></iframe>') is None
    bad = '<iframe src="https://api.anivideo.net/videohls.php?d=http://cdn.example/x.m3u8">'
    assert parse_player(bad) is None


@respx.mock
async def test_episodes_and_stream_for_the_subtitled_title():
    sub_page = mock_site()
    source = AnimesDigitalSource()
    result = await source.episodes(ANIME, "sub")
    assert result is not None
    assert result.episodes == list(range(1, 24))
    assert result.source_title == "Clannad"
    # Every episode shows the same cover, so there are no stills to offer.
    assert result.thumbnails == {}
    stream = await source.stream(ANIME, 23, "sub")
    assert stream is not None
    assert stream.url == "https://cdn.example/stream/c/clannad/23.mp4/index.m3u8"
    assert stream.kind == "hls"
    assert stream.upstream_headers == {}
    assert sub_page.call_count == 1


@respx.mock
async def test_dub_uses_the_dublado_title():
    mock_site()
    result = await AnimesDigitalSource().episodes(ANIME, "dub")
    assert result is not None
    assert result.episodes == list(range(1, 13))


@respx.mock
async def test_long_titles_read_every_list_page():
    mock_site(sub=listing(range(51, 121), pages=3))
    respx.get(f"{BASE}/anime/a/cl001/page/2/").mock(
        return_value=httpx.Response(200, text=listing(range(1, 51)))
    )
    respx.get(f"{BASE}/anime/a/cl001/page/3/").mock(
        return_value=httpx.Response(200, text=listing(range(0, 0)))
    )
    result = await AnimesDigitalSource().episodes(ANIME, "sub")
    assert result is not None
    assert result.episodes == list(range(1, 121))


@respx.mock
async def test_missing_title_and_missing_episode_give_none():
    mock_site()
    source = AnimesDigitalSource()
    assert await source.episodes({"id": 1, "title": "Something Else Entirely"}, "sub") is None
    assert await source.stream(ANIME, 99, "sub") is None


@respx.mock
async def test_episode_without_hls_player_gives_none():
    # Registered first, so it wins over the site's catch-all episode route.
    respx.get(f"{BASE}/video/a/5/").mock(
        return_value=httpx.Response(200, text='<iframe src="https://blogger.example/x"></iframe>')
    )
    mock_site()
    assert await AnimesDigitalSource().stream(ANIME, 5, "sub") is None


def test_load_sources_builds_it():
    sources = load_sources(["zoko", "animesdigital"])
    assert list(sources) == ["zoko", "animesdigital"]
    assert isinstance(sources["animesdigital"], AnimesDigitalSource)


FRIEREN = """
<a href="https://animesdigital.org/anime/a/sousou-no-frieren-2" title="x">
  <span class="title_anime">Sousou no Frieren 2</span></a>
<a href="https://animesdigital.org/anime/a/sousou-no-frieren" title="x">
  <span class="title_anime">Sousou no Frieren</span></a>
"""


def mock_search(pages: dict[str, str]) -> None:
    """Search answers by query: the site only finds whole phrases."""

    def handler(request: httpx.Request) -> httpx.Response:
        query = unquote(request.url.path.split("/")[-2])
        return httpx.Response(200, text=pages.get(query, ""))

    respx.get(url__regex=rf"{BASE}/pesquisa/.*").mock(side_effect=handler)


def test_search_queries_add_the_title_without_its_season():
    detail = {"title": "Sousou no Frieren 2nd Season", "alternative_titles": {"en": "Frieren"}}
    assert search_queries(detail) == [
        "Sousou no Frieren 2nd Season",
        "Frieren",
        "Sousou no Frieren",
    ]
    assert search_queries({"title": "Clannad"}) == ["Clannad"]


@respx.mock
async def test_sequel_matches_the_numbered_title_through_the_stem_search():
    mock_search({"Sousou no Frieren": FRIEREN})
    found = await find({"title": "Sousou no Frieren 2nd Season"}, _fetch, "sub")
    assert found is not None
    assert found.identifier == "sousou-no-frieren-2"


@respx.mock
async def test_sequel_never_falls_back_to_an_earlier_season():
    mock_search({"Sousou no Frieren": FRIEREN.split("</a>", 1)[1]})
    assert await find({"title": "Sousou no Frieren 2nd Season"}, _fetch, "sub") is None


async def _fetch(url: str) -> str:
    async with httpx.AsyncClient() as client:
        return (await client.get(url)).text
