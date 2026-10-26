import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base, TimestampMixin

LOCALES = ("pt", "en")


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    # Stored lower-cased so "Kafka" and "kafka" can't both register.
    username: Mapped[str] = mapped_column(String(32), unique=True)
    password_hash: Mapped[str]
    locale: Mapped[str] = mapped_column(String(5), default="pt")
    show_nsfw: Mapped[bool] = mapped_column(default=False)
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


class MalLink(TimestampMixin, Base):
    __tablename__ = "mal_links"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    access_token: Mapped[str]
    refresh_token: Mapped[str]
    expires_at: Mapped[datetime]
    mal_username: Mapped[str | None]
    mal_picture: Mapped[str | None]


class MalOAuthState(TimestampMixin, Base):
    __tablename__ = "mal_oauth_states"

    state: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    verifier: Mapped[str] = mapped_column(String(128))
