import uuid
from datetime import datetime

from sqlalchemy import Float, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.crypto import EncryptedString
from app.db import Base, TimestampMixin, utcnow

LOCALES = ("pt", "en")


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    # Stored lower-cased so "Kafka" and "kafka" can't both register.
    username: Mapped[str] = mapped_column(String(32), unique=True)
    password_hash: Mapped[str]
    locale: Mapped[str] = mapped_column(String(5), default="pt")
    show_nsfw: Mapped[bool] = mapped_column(default=True)
    # None means automatic (pt-BR, then English); "off" hides subtitles.
    subtitle_lang: Mapped[str | None] = mapped_column(String(8), default=None)
    is_admin: Mapped[bool] = mapped_column(default=False)


class Invite(TimestampMixin, Base):
    __tablename__ = "invites"

    code: Mapped[str] = mapped_column(String(64), primary_key=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    used_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    used_at: Mapped[datetime | None]
    expires_at: Mapped[datetime]


class RefreshToken(TimestampMixin, Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # Only a SHA-256 of the token is stored, so a database leak can't be replayed.
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime]
    revoked_at: Mapped[datetime | None]
    # One login = one family: rotation keeps the family, so a family is a "session" the user can
    # see and revoke. The device details are refreshed on every rotation.
    family_id: Mapped[uuid.UUID] = mapped_column(index=True)
    started_at: Mapped[datetime]
    user_agent: Mapped[str | None] = mapped_column(String(255))
    ip: Mapped[str | None] = mapped_column(String(64))


class MalLink(TimestampMixin, Base):
    __tablename__ = "mal_links"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    # Encrypted at rest with TOKEN_ENCRYPTION_KEY.
    access_token: Mapped[str] = mapped_column(EncryptedString)
    refresh_token: Mapped[str] = mapped_column(EncryptedString)
    expires_at: Mapped[datetime]
    mal_username: Mapped[str | None]
    mal_picture: Mapped[str | None]


class MalOAuthState(TimestampMixin, Base):
    __tablename__ = "mal_oauth_states"

    state: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    verifier: Mapped[str] = mapped_column(String(128))
    # The user's language when linking started, so the callback can send them back to it.
    locale: Mapped[str | None] = mapped_column(String(5))


class WatchProgress(Base):
    """Where a user stopped in one episode. Keyed by MAL anime id, so it is source-agnostic."""

    __tablename__ = "watch_progress"
    __table_args__ = (Index("ix_watch_progress_user_updated", "user_id", "updated_at"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    anime_id: Mapped[int] = mapped_column(primary_key=True)
    episode: Mapped[int] = mapped_column(primary_key=True)
    position_seconds: Mapped[float] = mapped_column(Float)
    duration_seconds: Mapped[float | None] = mapped_column(Float)
    completed: Mapped[bool] = mapped_column(default=False)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)
