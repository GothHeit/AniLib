"""Linking a user's MyAnimeList account (OAuth2 with PKCE) and editing their list."""

import secrets
from datetime import timedelta
from urllib.parse import urlencode

import httpx
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.db import utcnow
from app.errors import ApiError
from app.mal.client import API_BASE, filter_nsfw
from app.models import MalLink, MalOAuthState, User

OAUTH_BASE = "https://myanimelist.net/v1/oauth2"
STATE_LIFETIME = timedelta(minutes=10)


def _bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class MalAccounts:
    def __init__(self, settings: Settings, http: httpx.AsyncClient):
        self._settings = settings
        self._http = http

    async def authorize_url(self, session: AsyncSession, user: User) -> str:
        # MAL only supports the "plain" PKCE method.
        verifier = secrets.token_urlsafe(64)
        state = secrets.token_urlsafe(24)
        session.add(MalOAuthState(state=state, user_id=user.id, verifier=verifier))
        await session.commit()
        params = {
            "response_type": "code",
            "client_id": self._settings.mal_client_id,
            "code_challenge": verifier,
            "code_challenge_method": "plain",
            "state": state,
            "redirect_uri": self._settings.mal_redirect_uri,
        }
        return f"{OAUTH_BASE}/authorize?{urlencode(params)}"

    async def complete(self, session: AsyncSession, code: str, state: str) -> None:
        pending = await session.get(MalOAuthState, state)
        if pending is None or pending.created_at < utcnow() - STATE_LIFETIME:
            raise ApiError(400, "invalid_oauth_state", "Unknown or expired OAuth state")
        await session.delete(pending)

        tokens = await self._token_request(
            {
                "grant_type": "authorization_code",
                "code": code,
                "code_verifier": pending.verifier,
                "redirect_uri": self._settings.mal_redirect_uri,
            }
        )
        if tokens is None:
            await session.commit()
            raise ApiError(400, "mal_link_failed", "MyAnimeList rejected the authorization")

        link = await session.get(MalLink, pending.user_id)
        if link is None:
            link = MalLink(user_id=pending.user_id)
            session.add(link)
        self._apply_tokens(link, tokens)
        profile = await self.profile(link.access_token)
        if profile:
            link.mal_username = profile.get("name")
            link.mal_picture = profile.get("picture")
        await session.commit()

    async def status(self, session: AsyncSession, user: User) -> dict:
        link = await session.get(MalLink, user.id)
        if link is None:
            return {"connected": False}
        result = {
            "connected": True,
            "mal_username": link.mal_username,
            "mal_picture": link.mal_picture,
            "statistics": None,
        }
        try:
            token = await self._valid_token(session, user)
        except ApiError:
            return result
        profile = await self.profile(token)
        if profile:
            result["statistics"] = profile.get("anime_statistics")
        return result

    async def disconnect(self, session: AsyncSession, user: User) -> None:
        await session.execute(delete(MalLink).where(MalLink.user_id == user.id))
        await session.commit()

    async def animelist(self, session: AsyncSession, user: User, status: str | None) -> dict:
        token = await self._valid_token(session, user)
        params: dict | None = {
            "fields": "list_status,num_episodes,main_picture,mean,rating,genres",
            "limit": 1000,
            "nsfw": str(user.show_nsfw).lower(),
            "sort": "list_updated_at",
        }
        if status:
            params["status"] = status

        items: list[dict] = []
        url: str | None = f"{API_BASE}/users/@me/animelist"
        while url:
            response = await self._http.get(url, headers=_bearer(token), params=params)
            if response.status_code != 200:
                raise ApiError(
                    502, "mal_unavailable", f"MyAnimeList answered {response.status_code}"
                )
            data = response.json()
            items.extend(data.get("data", []))
            url = (data.get("paging") or {}).get("next")
            params = None  # the "next" URL already carries them
        return {"data": filter_nsfw(items, user.show_nsfw)}

    async def update_entry(
        self, session: AsyncSession, user: User, anime_id: int, changes: dict
    ) -> dict:
        token = await self._valid_token(session, user)
        response = await self._http.patch(
            f"{API_BASE}/anime/{anime_id}/my_list_status", headers=_bearer(token), data=changes
        )
        if response.status_code != 200:
            raise ApiError(502, "mal_update_failed", f"MyAnimeList answered {response.status_code}")
        return response.json()

    async def remove_entry(self, session: AsyncSession, user: User, anime_id: int) -> None:
        token = await self._valid_token(session, user)
        response = await self._http.delete(
            f"{API_BASE}/anime/{anime_id}/my_list_status", headers=_bearer(token)
        )
        if response.status_code not in (200, 404):
            raise ApiError(502, "mal_update_failed", f"MyAnimeList answered {response.status_code}")

    async def profile(self, token: str) -> dict | None:
        try:
            response = await self._http.get(
                f"{API_BASE}/users/@me",
                headers=_bearer(token),
                params={"fields": "name,picture,anime_statistics"},
            )
        except httpx.HTTPError:
            return None
        return response.json() if response.status_code == 200 else None

    async def _valid_token(self, session: AsyncSession, user: User) -> str:
        link = await session.get(MalLink, user.id)
        if link is None:
            raise ApiError(400, "mal_not_linked", "No MyAnimeList account linked")
        if link.expires_at > utcnow() + timedelta(minutes=1):
            return link.access_token

        tokens = await self._token_request(
            {"grant_type": "refresh_token", "refresh_token": link.refresh_token}
        )
        if tokens is None:
            raise ApiError(401, "mal_session_expired", "MyAnimeList session expired, link again")
        self._apply_tokens(link, tokens)
        await session.commit()
        return link.access_token

    async def _token_request(self, data: dict) -> dict | None:
        payload = {
            "client_id": self._settings.mal_client_id,
            "client_secret": self._settings.mal_client_secret,
            **data,
        }
        try:
            response = await self._http.post(f"{OAUTH_BASE}/token", data=payload)
        except httpx.HTTPError:
            return None
        return response.json() if response.status_code == 200 else None

    @staticmethod
    def _apply_tokens(link: MalLink, tokens: dict) -> None:
        link.access_token = tokens["access_token"]
        link.refresh_token = tokens["refresh_token"]
        link.expires_at = utcnow() + timedelta(seconds=tokens["expires_in"])
