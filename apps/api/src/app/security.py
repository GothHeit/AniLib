import hashlib
import secrets
import uuid
from datetime import timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError

from app.config import get_settings
from app.db import utcnow

ALGORITHM = "HS256"
_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except VerificationError:
        return False


def _encode(claims: dict, lifetime: timedelta) -> str:
    now = utcnow()
    payload = {**claims, "iat": now, "exp": now + lifetime}
    return jwt.encode(payload, get_settings().jwt_secret, algorithm=ALGORITHM)


def _decode(token: str, kind: str) -> dict | None:
    try:
        claims = jwt.decode(token, get_settings().jwt_secret, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
    return claims if claims.get("typ") == kind else None


def create_access_token(user_id: uuid.UUID) -> str:
    minutes = get_settings().access_token_minutes
    return _encode({"sub": str(user_id), "typ": "access"}, timedelta(minutes=minutes))


def decode_access_token(token: str) -> uuid.UUID | None:
    claims = _decode(token, "access")
    return uuid.UUID(claims["sub"]) if claims else None


def create_playback_token(
    user_id: uuid.UUID, source: str, anime_id: int, episode: int, lang: str
) -> str:
    """A token scoped to one episode, for players that can't send an Authorization header."""
    minutes = get_settings().playback_token_minutes
    claims = {
        "sub": str(user_id),
        "typ": "playback",
        "src": source,
        "aid": anime_id,
        "ep": episode,
        "lang": lang,
    }
    return _encode(claims, timedelta(minutes=minutes))


def decode_playback_token(token: str) -> dict | None:
    return _decode(token, "playback")


def new_opaque_token() -> str:
    return secrets.token_urlsafe(48)


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()
