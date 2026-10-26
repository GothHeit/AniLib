"""add sessions to refresh tokens

Revision ID: c5e3f7a92b18
Revises: b4d2e6f81a07
Create Date: 2026-10-27 00:10:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c5e3f7a92b18"
down_revision: str | Sequence[str] | None = "b4d2e6f81a07"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("refresh_tokens", sa.Column("family_id", sa.Uuid(), nullable=True))
    op.add_column(
        "refresh_tokens", sa.Column("started_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column("refresh_tokens", sa.Column("user_agent", sa.String(length=255), nullable=True))
    op.add_column("refresh_tokens", sa.Column("ip", sa.String(length=64), nullable=True))
    # Existing tokens each become a session of their own.
    op.execute("UPDATE refresh_tokens SET family_id = id, started_at = created_at")
    op.alter_column("refresh_tokens", "family_id", nullable=False)
    op.alter_column("refresh_tokens", "started_at", nullable=False)
    op.create_index("ix_refresh_tokens_family_id", "refresh_tokens", ["family_id"])
    op.add_column("mal_oauth_states", sa.Column("locale", sa.String(length=5), nullable=True))


def downgrade() -> None:
    op.drop_column("mal_oauth_states", "locale")
    op.drop_index("ix_refresh_tokens_family_id", table_name="refresh_tokens")
    op.drop_column("refresh_tokens", "ip")
    op.drop_column("refresh_tokens", "user_agent")
    op.drop_column("refresh_tokens", "started_at")
    op.drop_column("refresh_tokens", "family_id")
