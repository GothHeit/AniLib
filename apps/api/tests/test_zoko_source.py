import base64
import json

import httpx
import respx

from app.sources.zoko import EMBED, KEY, ZokoSource, decode_blob, parse_subtitles


def blob(data: dict) -> str:
    raw = json.dumps(data).encode()
    return base64.b64encode(bytes(b ^ KEY[i % len(KEY)] for i, b in enumerate(raw))).decode()


def page(data: dict | None) -> httpx.Response:
    body = f'<script>window.__P="{blob(data)}"</script>' if data else "<html>Player</html>"
    return httpx.Response(200, text=body)


def test_decode_blob_round_trip_and_garbage():
    assert decode_blob(blob({"src": "https://x/m.m3u8"})) == {"src": "https://x/m.m3u8"}
    assert decode_blob("%%not base64%%") is None
    assert decode_blob(base64.b64encode(b"\x01\x02").decode()) is None


def mock_episodes(last: int, lang: str = "sub"):
    def handler(request: httpx.Request) -> httpx.Response:
        episode = int(request.url.path.split("/")[-2])
        return page({"src": f"https://hls.example/{episode}.m3u8"} if episode <= last else None)

    respx.get(url__regex=rf"{EMBED}/stream/mal/9253/\d+/{lang}").mock(side_effect=handler)


ANIME = {"id": 9253, "title": "Steins;Gate", "num_episodes": 24}


@respx.mock
async def test_episodes_use_known_count_when_the_last_one_exists():
    mock_episodes(24)
    result = await ZokoSource().episodes(ANIME, "sub")
    assert result is not None
    assert result.episodes == list(range(1, 25))


@respx.mock
async def test_episodes_bisect_when_the_source_has_fewer_than_mal():
    mock_episodes(13)
    result = await ZokoSource().episodes(ANIME, "sub")
    assert result is not None
    assert result.episodes[-1] == 13


@respx.mock
async def test_episodes_probe_unknown_length_and_missing_title():
    mock_episodes(137)
    result = await ZokoSource().episodes({**ANIME, "num_episodes": 0}, "sub")
    assert result is not None
    assert result.episodes[-1] == 137

    respx.clear()
    mock_episodes(0)
    assert await ZokoSource().episodes(ANIME, "sub") is None


@respx.mock
async def test_stream_is_hls_with_embed_referer_and_best_resolution():
    mock_episodes(24)
    respx.get("https://hls.example/1.m3u8").mock(
        return_value=httpx.Response(
            200,
            text="#EXTM3U\n#EXT-X-STREAM-INF:RESOLUTION=1280x720\na\n#EXT-X-STREAM-INF:RESOLUTION=1920x1080\nb\n",
        )
    )
    stream = await ZokoSource().stream(ANIME, 1, "sub")
    assert stream is not None
    assert (stream.kind, stream.resolution) == ("hls", 1080)
    assert stream.upstream_headers == {"Referer": f"{EMBED}/"}


@respx.mock
async def test_stream_missing_episode_is_none():
    mock_episodes(3)
    assert await ZokoSource().stream(ANIME, 9, "sub") is None


def test_subtitles_are_labelled_by_language_not_by_the_embed_lang_field():
    tracks = parse_subtitles(
        [
            {"lang": "en", "label": "English", "src": "https://h/e.vtt", "default": True},
            {"lang": "en", "label": "Portuguese", "src": "https://h/p.vtt", "default": False},
            {"lang": "en", "label": "Klingon", "src": "https://h/k.vtt"},
            {"lang": "en", "label": "Broken", "src": "javascript:alert(1)"},
        ]
    )
    assert [(t.lang, t.label) for t in tracks] == [
        ("en", "English"),
        ("pt-BR", "Portuguese"),
        ("und", "Klingon"),
    ]
    assert parse_subtitles(None) == ()
