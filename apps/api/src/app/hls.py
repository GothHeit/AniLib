"""Helpers to proxy HLS through the API.

Source hosts want a Referer a browser can't send, and spread segments over other hosts, so
every playlist is rewritten to point back at /watch/hls. Each rewritten URL is signed, so
the proxy only fetches URLs that came out of a playlist it already served (no open relay).
"""

import asyncio
import hashlib
import hmac
import ipaddress
import re
import socket
import time
from urllib.parse import quote, urljoin, urlsplit

from app.config import get_settings

URI_ATTR = re.compile(r'URI="([^"]*)"')
SEGMENT_LIFETIME = 6 * 3600
MAX_PLAYLIST_BYTES = 2 * 1024 * 1024
MAX_REDIRECTS = 3
INTERNAL_SUFFIXES = (".localhost", ".local", ".internal", ".lan", ".home", ".corp")


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
    try:
        addresses = await resolve_host(host)
    except OSError:
        return False
    return bool(addresses) and all(_public_ip(a) for a in addresses)


def _mac(url: str, referer: str, expires: int) -> str:
    key = get_settings().jwt_secret.encode()
    msg = f"hls\n{url}\n{referer}\n{expires}".encode()
    return hmac.new(key, msg, hashlib.sha256).hexdigest()[:32]


def signed_link(url: str, referer: str) -> str:
    # Relative to /watch/hls on purpose: it resolves under whatever prefix the client
    # reaches the API through (the web app proxies it under /api/proxy).
    expires = int(time.time()) + SEGMENT_LIFETIME
    return (
        f"hls?u={quote(url, safe='')}&r={quote(referer, safe='')}"
        f"&e={expires}&s={_mac(url, referer, expires)}"
    )


def verify_link(url: str, referer: str, expires: int, sig: str) -> bool:
    return expires > time.time() and hmac.compare_digest(sig, _mac(url, referer, expires))


def is_playlist(url: str, content_type: str) -> bool:
    return "mpegurl" in content_type.lower() or url.split("?")[0].lower().endswith(".m3u8")


def rewrite_playlist(text: str, base_url: str, referer: str) -> str:
    def link(target: str) -> str:
        absolute = urljoin(base_url, target)
        # Refused URLs are blanked, so the player just fails to load that part.
        return signed_link(absolute, referer) if looks_public(absolute) else ""

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
