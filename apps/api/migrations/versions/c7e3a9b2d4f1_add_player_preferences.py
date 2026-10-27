"""add player preferences

Revision ID: c7e3a9b2d4f1
Revises: c5e3f7a92b18
Create Date: 2026-10-27 00:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c7e3a9b2d4f1"
down_revision: str | Sequence[str] | None = "c5e3f7a92b18"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "player_preferences",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("subtitle_size", sa.String(length=16), nullable=False),
        sa.Column("subtitle_color", sa.String(length=16), nullable=False),
        sa.Column("subtitle_background", sa.String(length=16), nullable=False),
        sa.Column("subtitle_position", sa.String(length=16), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )


def downgrade() -> None:
    op.drop_table("player_preferences")
