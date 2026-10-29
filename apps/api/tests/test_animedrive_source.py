import httpx
import pytest
import respx

from app import hls
from app.sources import load_sources
from app.sources.animedrive import (
    BASE,
    REFERER,
    AnimeDriveSource,
    find,
    parse_episodes,
    parse_results,
    parse_servers,
    quality_rank,
)


@pytest.fixture(autouse=True)
def public_dns(monkeypatch):
    async def resolve(host):
        return ["10.0.0.5"] if host.endswith(".internal-cdn.example") else ["93.184.216.34"]

    monkeypatch.setattr(hls, "resolve_host", resolve)
    hls._public_hosts.clear()


def result(slug: str, name: str, alternatives: str = "") -> str:
    return f"""
    <div class="result-item"><article><div class="image"><div class="thumbnail animation-2">
      <a href="{BASE}/anime/{slug}"><img src="https://img/x.jpg" alt="{name}" /></a></div></div>
      <div class="details"><div class="title"><a href="{BASE}/anime/{slug}">{name}</a></div>
      <div class="contenido"><p>T&iacute;tulo Alternativo: {alternatives} Sinopse: Algo ...</p>
      </div></div></article></div>"""


SEARCH = (
    result("death-note", "Death Note", "Death Note , デスノート , DN")
    + result("clannad-after-story", "Clannad: After Story", "CLANNAD〜AFTER STORY〜")
    + result("clannad-dublado", "Clannad Dublado &#8211; Todos os Epis&oacute;dios")
    + result("clannad", "Clannad")
    + f"""<div class="result-item"><article><div class="details"><div class="title">
      <a href="{BASE}/filme/clannad-movie">Clannad Movie</a></div></div></article></div>"""
)


def card(number: str, slug: str = "clannad", image: str = "") -> str:
    url = f"{BASE}/episodio/{slug}-episodio-{number}"
    image = image or f"https://img/{slug}-{number}-300x170.jpg"
    return (
        f"<div class='episode-card' data-episode-number='{number}' data-episode-title='x'>"
        f"<a href='{url}'><img src='{image}' alt='x' class='episode-thumbnail'></a>"
        f"<div class='episode-info'><h3 class='episode-title'><a href='{url}'>x</a></h3></div>"
        f"<a href='{url}' class='episode-mini-number' hidden>{number}</a></div>"
    )


def title_page(numbers, slug: str = "clannad") -> str:
    cards = "".join(card(f"{n:02}" if isinstance(n, int) else n, slug) for n in numbers)
    return f"<div id='episodes'><div class='episodios-grid'>{cards}</div></div>"


def server_block(number: int, body: str, active: bool = False) -> str:
    state = " is-active" if active else ""
    return (
        f'<div class="animeq-player__source{state}" data-animeq-source="{number}" >'
        f'<div class="animeq-player__media">{body}</div></div>'
    )


def video(url: str) -> str:
    return f'<video controls><source src="{url}" type="video/mp4"></video>'


def button(number: int, name: str) -> str:
    return (
        f'<button type="button" class="animeq-player__server" data-animeq-switch="{number}" '
        f'data-source-name="{name}" role="tab"><span>{name}</span></button>'
    )


def episode_page(servers: list[tuple[str, str]]) -> str:
    blocks = "".join(server_block(i, body, i == 0) for i, (_name, body) in enumerate(servers))
    buttons = "".join(button(i, name) for i, (name, _body) in enumerate(servers))
    return (
        f'<section class="animeq-player"><div class="animeq-player__stage">{blocks}</div>'
        f'<div class="animeq-player__meta"><div class="animeq-player__servers">{buttons}'
        "</div></div></section>"
    )


def mp4(slug: str, episode: int) -> str:
    return f"https://cdn.example/{slug}/{episode:02}.mp4"


ANIME = {"id": 2167, "title": "Clannad", "num_episodes": 23}
DEATH_NOTE = {"id": 1535, "title": "Death Note"}


def mock_site(sub: str = "", dub: str = "", alive: bool = True):
    respx.get(url__startswith=f"{BASE}/?s=").mock(return_value=httpx.Response(200, text=SEARCH))
    sub_page = respx.get(f"{BASE}/anime/clannad").mock(
        return_value=httpx.Response(200, text=sub or title_page(range(1, 24)))
    )
    respx.get(f"{BASE}/anime/clannad-dublado").mock(
        return_value=httpx.Response(200, text=dub or title_page(range(1, 13), "clannad-dublado"))
    )
    respx.get(f"{BASE}/anime/death-note").mock(
        return_value=httpx.Response(200, text=title_page(range(1, 38), "death-note"))
    )

    def episode(request: httpx.Request) -> httpx.Response:
        slug, number = request.url.path.split("/")[-1].rsplit("-episodio-", 1)
        n = int(number)
        if slug == "death-note":
            servers = [
                ("Legendado", video(mp4("dn", n))),
                ("Dublado", video(mp4("dn-dublado", n))),
            ]
        else:
            servers = [
                (
                    "Mobile / Celular",
                    '<iframe src="https://www.blogger.com/video.g?token=x"></iframe>',
                ),
                ("SD", video(mp4(f"{slug}-sd", n))),
                ("FullHD / HLS", video(mp4(slug, n))),
                ("FHD", '<iframe src="https://animes.strp2p.com/#abc"></iframe>'),
            ]
        return httpx.Response(200, text=episode_page(servers))

    respx.get(url__startswith=f"{BASE}/episodio/").mock(side_effect=episode)
    probe = respx.get(url__startswith="https://cdn.example/").mock(
        return_value=httpx.Response(206 if alive else 404, content=b"\0")
    )
    return sub_page, probe


def test_parse_results_reads_series_names_and_alternatives():
    results = parse_results(SEARCH)
    assert [(r.slug, r.name) for r in results] == [
        ("death-note", "Death Note"),
        ("clannad-after-story", "Clannad: After Story"),
        ("clannad-dublado", "Clannad Dublado"),
        ("clannad", "Clannad"),
    ]
    assert results[0].alternatives == ("Death Note", "デスノート", "DN")


def test_parse_episodes_keeps_whole_numbers_once():
    page = title_page([1, 2, "1022.5", "1108-5", "Especial"]) + card("02", "clannad-dublado")
    assert [(n, url) for n, url, _img in parse_episodes(page, dubbed=False)] == [
        (1, f"{BASE}/episodio/clannad-episodio-01"),
        (2, f"{BASE}/episodio/clannad-episodio-02"),
    ]


def test_parse_episodes_skips_stray_dubbed_episodes_on_a_subtitled_title():
    page = title_page([1, 2, 3]).replace("clannad-episodio-02", "clannad-dublado-episodio-02")
    assert [n for n, _url, _img in parse_episodes(page, dubbed=False)] == [1, 3]
    assert [n for n, _url, _img in parse_episodes(page, dubbed=True)] == [1, 2, 3]


def test_parse_servers_keeps_direct_videos_best_first():
    page = episode_page(
        [
            ("SD", video("https://a.example/sd.mp4")),
            ("HD", '<iframe src="https://www.blogger.com/video.g?token=x"></iframe>'),
            (
                "FHD",
                '<div data-animeq-videojs-host data-video-src="https://b.example/fhd.mp4"></div>',
            ),
            ("Velho", '<video src="http://c.example/insecure.mp4"></video>'),
        ]
    )
    servers = parse_servers(page, dubbed=False)
    assert [(s.label, s.url, s.lang) for s in servers] == [
        ("FHD", "https://b.example/fhd.mp4", "sub"),
        ("SD", "https://a.example/sd.mp4", "sub"),
    ]


def test_parse_servers_reads_the_version_from_the_label():
    page = episode_page(
        [
            ("Legendado", video("https://a.example/1.mp4")),
            ("Dublado", video("https://a.example/2.mp4")),
        ]
    )
    assert [s.lang for s in parse_servers(page, dubbed=False)] == ["sub", "dub"]
    assert [s.lang for s in parse_servers(page, dubbed=True)] == ["sub", "dub"]
    plain = episode_page([("FHD", video("https://a.example/1.mp4"))])
    assert [s.lang for s in parse_servers(plain, dubbed=True)] == ["dub"]


def test_quality_rank_orders_the_labels():
    labels = ["Legendado", "SD", "HD", "FullHD / HLS"]
    assert sorted(labels, key=quality_rank) == labels


@respx.mock
async def test_episodes_and_stream_for_the_subtitled_title():
    sub_page, probe = mock_site()
    source = AnimeDriveSource()
    result = await source.episodes(ANIME, "sub")
    assert result is not None
    assert result.episodes == list(range(1, 24))
    assert result.source_title == "Clannad"
    assert result.thumbnails[3] == "https://img/clannad-03-300x170.jpg"
    stream = await source.stream(ANIME, 23, "sub")
    assert stream is not None
    assert stream.url == mp4("clannad", 23)
    assert stream.kind == "mp4"
    assert stream.resolution is None
    assert stream.upstream_headers == {"Referer": REFERER}
    assert sub_page.call_count == 1
    assert probe.calls.last.request.headers["Range"] == "bytes=0-0"
    # Cached: the video endpoint asks again on every seek.
    assert await source.stream(ANIME, 23, "sub") == stream
    assert probe.call_count == 1


@respx.mock
async def test_dead_server_falls_through_to_the_next():
    # Registered first, so it wins over the catch-all video host route.
    respx.get(mp4("clannad", 4)).mock(return_value=httpx.Response(404))
    mock_site()
    stream = await AnimeDriveSource().stream(ANIME, 4, "sub")
    assert stream is not None
    assert stream.url == mp4("clannad-sd", 4)


@respx.mock
async def test_servers_on_private_addresses_are_never_fetched():
    private = [
        respx.get(url__startswith="https://10.0.0.1/").mock(return_value=httpx.Response(206)),
        respx.get(url__startswith="https://media.internal-cdn.example/").mock(
            return_value=httpx.Response(206)
        ),
    ]
    page = episode_page(
        [
            ("FHD", video("https://10.0.0.1/clannad/04.mp4")),
            ("HD", video("https://media.internal-cdn.example/clannad/04.mp4")),
            ("SD", video(mp4("clannad-sd", 4))),
        ]
    )
    respx.get(f"{BASE}/episodio/clannad-episodio-04").mock(
        return_value=httpx.Response(200, text=page)
    )
    mock_site()
    stream = await AnimeDriveSource().stream(ANIME, 4, "sub")
    assert stream is not None
    assert stream.url == mp4("clannad-sd", 4)
    assert all(route.call_count == 0 for route in private)


@respx.mock
async def test_redirect_to_a_private_address_is_not_followed():
    respx.get(mp4("clannad", 4)).mock(
        return_value=httpx.Response(302, headers={"Location": "https://127.0.0.1/x.mp4"})
    )
    respx.get(mp4("clannad-sd", 4)).mock(
        return_value=httpx.Response(302, headers={"Location": "https://cdn2.example/sd.mp4"})
    )
    target = respx.get("https://cdn2.example/sd.mp4").mock(return_value=httpx.Response(206))
    loopback = respx.get(url__startswith="https://127.0.0.1/").mock(
        return_value=httpx.Response(206)
    )
    mock_site()
    stream = await AnimeDriveSource().stream(ANIME, 4, "sub")
    assert stream is not None
    # The public redirect was followed to check the server, but the link offered is the page's.
    assert stream.url == mp4("clannad-sd", 4)
    assert target.call_count == 1
    assert loopback.call_count == 0


@respx.mock
async def test_no_live_server_gives_none():
    mock_site(alive=False)
    assert await AnimeDriveSource().stream(ANIME, 4, "sub") is None


@respx.mock
async def test_dub_uses_the_dublado_title():
    mock_site()
    source = AnimeDriveSource()
    result = await source.episodes(ANIME, "dub")
    assert result is not None
    assert result.episodes == list(range(1, 13))
    stream = await source.stream(ANIME, 2, "dub")
    assert stream is not None
    assert stream.url == mp4("clannad-dublado", 2)


@respx.mock
async def test_dub_without_a_dublado_title_uses_the_dubbed_servers():
    mock_site()
    source = AnimeDriveSource()
    result = await source.episodes(DEATH_NOTE, "dub")
    assert result is not None
    assert result.episodes == list(range(1, 38))
    sub = await source.stream(DEATH_NOTE, 5, "sub")
    dub = await source.stream(DEATH_NOTE, 5, "dub")
    assert sub is not None and sub.url == mp4("dn", 5)
    assert dub is not None and dub.url == mp4("dn-dublado", 5)


@respx.mock
async def test_dub_is_missing_when_episodes_only_have_subtitles():
    mock_site()
    respx.get(url__startswith=f"{BASE}/?s=").mock(
        return_value=httpx.Response(200, text=result("clannad", "Clannad"))
    )
    assert await AnimeDriveSource().episodes(ANIME, "dub") is None


@respx.mock
async def test_missing_title_and_missing_episode_give_none():
    mock_site()
    source = AnimeDriveSource()
    assert await source.episodes({"id": 1, "title": "Something Else Entirely"}, "sub") is None
    assert await source.stream(ANIME, 99, "sub") is None


@respx.mock
async def test_title_without_episodes_gives_none():
    mock_site(sub="<div id='episodes'><h2>Total de Episódios (0)</h2></div>")
    assert await AnimeDriveSource().episodes(ANIME, "sub") is None


@respx.mock
async def test_sequel_never_falls_back_to_an_earlier_season():
    respx.get(url__startswith=f"{BASE}/?s=").mock(
        return_value=httpx.Response(
            200,
            text=result("jujutsu-kaisen", "Jujutsu Kaisen")
            + result("jujutsu-kaisen-3", "Jujutsu Kaisen 3"),
        )
    )
    async with httpx.AsyncClient() as client:

        async def fetch(url: str) -> str:
            return (await client.get(url)).text

        assert await find({"title": "Jujutsu Kaisen 2nd Season"}, fetch, "sub") is None
        found = await find({"title": "Jujutsu Kaisen 3rd Season"}, fetch, "sub")
    assert found is not None
    assert found.identifier == "jujutsu-kaisen-3"


def test_load_sources_builds_it():
    sources = load_sources(["animedrive"])
    assert isinstance(sources["animedrive"], AnimeDriveSource)
