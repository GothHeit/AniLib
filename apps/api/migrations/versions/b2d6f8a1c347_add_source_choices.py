"""add source choices

Revision ID: b2d6f8a1c347
Revises: a1c5e7b9d302
Create Date: 2026-10-28 15:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2d6f8a1c347"
down_revision: str | Sequence[str] | None = "a1c5e7b9d302"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "source_choices",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("anime_id", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(length=40), nullable=False),
        sa.Column("lang", sa.String(length=3), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "anime_id"),
    )


def downgrade() -> None:
    op.drop_table("source_choices")
