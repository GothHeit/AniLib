"""add continue hidden

Revision ID: d6f4a8b3c5e2
Revises: c7e3a9b2d4f1
Create Date: 2026-10-27 02:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d6f4a8b3c5e2"
down_revision: str | Sequence[str] | None = "c7e3a9b2d4f1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "continue_hidden",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("anime_id", sa.Integer(), nullable=False),
        sa.Column("hidden_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "anime_id"),
    )


def downgrade() -> None:
    op.drop_table("continue_hidden")
