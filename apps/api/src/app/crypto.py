"""Encryption at rest for secrets stored in the database (MAL tokens)."""

from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken, MultiFernet
from sqlalchemy import String
from sqlalchemy.engine import Dialect
from sqlalchemy.types import TypeDecorator

from app.config import get_settings

# Every Fernet token starts with this (version byte 0x80, base64-encoded).
FERNET_PREFIX = "gAAAA"


@lru_cache
def _fernet(raw_keys: str) -> MultiFernet:
    # Comma-separated keys allow rotation: the first encrypts, all of them decrypt.
    return MultiFernet([Fernet(k.strip()) for k in raw_keys.split(",") if k.strip()])


def encrypt(value: str) -> str:
    return _fernet(get_settings().token_encryption_key).encrypt(value.encode()).decode()


def decrypt(value: str) -> str:
    try:
        return _fernet(get_settings().token_encryption_key).decrypt(value.encode()).decode()
    except InvalidToken:
        raise ValueError("stored secret can't be decrypted with TOKEN_ENCRYPTION_KEY") from None


class EncryptedString(TypeDecorator[str]):
    """A string column that is encrypted on write and decrypted on read."""

    impl = String
    cache_ok = True

    def process_bind_param(self, value: str | None, dialect: Dialect) -> str | None:
        return None if value is None else encrypt(value)

    def process_result_value(self, value: str | None, dialect: Dialect) -> str | None:
        return None if value is None else decrypt(value)
