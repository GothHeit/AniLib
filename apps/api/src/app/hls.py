"""Helpers to proxy HLS through the API.

Source hosts want a Referer a browser can't send, and spread segments over other hosts, so
every playlist is rewritten to point back at /watch/hls. Each rewritten URL is signed, so
the proxy only fetches URLs that came out of a playlist it already served (no open relay).
Signatures are bound to the viewer, so a copied link is useless to anyone else.

The local library uses the same links with file: URLs, which are only ever served from inside
the library folder.
"""

import asyncio
import hashlib
import hmac
import ipaddress
import re
import socket
import time
from pathlib import Path
from urllib.parse import quote, unquote, urljoin, urlsplit

from cachetools import TTLCache

from app.config import get_settings

URI_ATTR = re.compile(r'URI="([^"]*)"')
# Long enough for a film watched with a few pauses; a stale link only needs a retry.
SEGMENT_LIFETIME = 4 * 3600
# How long a host's DNS verdict is trusted. Segments come from a handful of hosts.
DNS_TTL = 300
MAX_PLAYLIST_BYTES = 2 * 1024 * 1024
MAX_REDIRECTS = 3
INTERNAL_SUFFIXES = (".localhost", ".local", ".internal", ".lan", ".home", ".corp")
# What a signed link points at, when the proxy can't tell from the upstream answer:
# "" a playlist or segment, "sub" WebVTT subtitles, "img" a still image, "ass" styled
# subtitles and "font" a font for them (both local library only).
KINDS = ("", "sub", "img", "ass", "font")
SAFE_IMAGES = ("image/jpeg", "image/png", "image/webp", "image/gif", "image/avif")

_public_hosts: TTLCache[str, bool] = TTLCache(maxsize=1024, ttl=DNS_TTL)


def _public_ip(value: str) -> bool:
    try:
        return ipaddress.ip_address(value).is_global
    except ValueError:
        return False


def looks_public(url: str) -> bool:
    """Cheap check on the URL text alone: http(s), and a real hostname or a public IP.
    Hosts come from third-party playlists, so nothing internal may be reachable through us."""
    try:
        parts = urlsplit(url)
        host = parts.hostname
    except ValueError:
        return False
    if parts.scheme not in ("http", "https") or not host:
        return False
    try:
        ipaddress.ip_address(host)
    except ValueError:
        # A name: single-label hosts (db, redis) and internal suffixes never face the internet.
        return "." in host and not host.endswith(INTERNAL_SUFFIXES) and host != "localhost"
    return _public_ip(host)


async def resolve_host(host: str) -> list[str]:
    infos = await asyncio.get_running_loop().getaddrinfo(host, None, type=socket.SOCK_STREAM)
    return [str(info[4][0]) for info in infos]


async def is_public_target(url: str) -> bool:
    """`looks_public` plus DNS: every address the name resolves to must be public."""
    if not looks_public(url):
        return False
    host = urlsplit(url).hostname or ""
    try:
        ipaddress.ip_address(host)
        return True
    except ValueError:
        pass
    if host in _public_hosts:
        return _public_hosts[host]
    try:
        addresses = await resolve_host(host)
    except OSError:
        # Not cached: a lookup that failed may work on the next segment.
        return False
    verdict = bool(addresses) and all(_public_ip(a) for a in addresses)
    _public_hosts[host] = verdict
    return verdict


def _mac(url: str, referer: str, kind: str, viewer: str, expires: int) -> str:
    key = get_settings().jwt_secret.encode()
    msg = f"hls\n{url}\n{referer}\n{kind}\n{viewer}\n{expires}".encode()
    return hmac.new(key, msg, hashlib.sha256).hexdigest()[:32]


def signed_link(url: str, referer: str, viewer: str, kind: str = "") -> str:
    """`viewer` is the user id the link is for; the proxy only serves it to that user."""
    # Relative to /watch/hls on purpose: it resolves under whatever prefix the client
    # reaches the API through (the web app proxies it under /api/proxy).
    expires = int(time.time()) + SEGMENT_LIFETIME
    kind_param = f"&k={kind}" if kind else ""
    return (
        f"hls?u={quote(url, safe='')}&r={quote(referer, safe='')}{kind_param}"
        f"&e={expires}&s={_mac(url, referer, kind, viewer, expires)}"
    )


def verify_link(url: str, referer: str, kind: str, viewer: str, expires: int, sig: str) -> bool:
    return (
        kind in KINDS
        and expires > time.time()
        and hmac.compare_digest(sig, _mac(url, referer, kind, viewer, expires))
    )


def is_playlist(url: str, content_type: str) -> bool:
    return "mpegurl" in content_type.lower() or url.split("?")[0].lower().endswith(".m3u8")


def media_type(url: str, kind: str, upstream_type: str) -> str:
    """The type to serve a non-playlist with. Hosts often disguise segments as images, so
    their own type is only trusted when it already says video or audio."""
    path = url.split("?")[0].lower()
    upstream_type = upstream_type.split(";")[0].strip().lower()
    if kind == "sub" or path.endswith(".vtt") or upstream_type == "text/vtt":
        return "text/vtt"
    if kind == "img":
        # Raster formats only: an SVG served from our origin could run script.
        return upstream_type if upstream_type in SAFE_IMAGES else "image/jpeg"
    if upstream_type.startswith(("video/", "audio/")):
        return upstream_type
    if path.endswith((".m4s", ".mp4")):
        return "video/mp4"
    return "video/mp2t"


LOCAL_TYPES = {
    ".m4s": "video/mp4",
    ".mp4": "video/mp4",
    ".ts": "video/mp2t",
    ".vtt": "text/vtt",
    ".ass": "text/plain; charset=utf-8",
    ".jpg": "image/jpeg",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".ttc": "font/collection",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
}


def local_path(url: str) -> Path | None:
    """The library file a file: URL names; None for anything else, or anything that leads
    outside the library folder (dot segments, symlinks)."""
    root = get_settings().local_library_dir
    if not root or not url.startswith("file:"):
        return None
    path = Path(unquote(urlsplit(url).path)).resolve()
    if not path.is_relative_to(Path(root).resolve()) or not path.is_file():
        return None
    return path


def local_media_type(path: Path) -> str:
    return LOCAL_TYPES.get(path.suffix.lower(), "application/octet-stream")


def rewrite_playlist(text: str, base_url: str, referer: str, viewer: str) -> str:
    local = base_url.startswith("file:")

    def link(target: str) -> str:
        # Inline data (keys, init sections) needs no fetching and must reach the player as is.
        if target.startswith("data:"):
            return target
        absolute = urljoin(base_url, target)
        # A library playlist may only point inside the library, a remote one only at the
        # internet. Refused URLs are blanked, so the player just fails to load that part.
        allowed = local_path(absolute) is not None if local else looks_public(absolute)
        return signed_link(absolute, referer, viewer) if allowed else ""

    lines = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            lines.append(line)
        elif stripped.startswith("#"):
            # Tags like EXT-X-MEDIA, EXT-X-KEY and EXT-X-MAP carry URIs in attributes.
            lines.append(URI_ATTR.sub(lambda m: f'URI="{link(m.group(1))}"', line))
        elif target := link(stripped):
            lines.append(target)
    return "\n".join(lines) + "\n"
