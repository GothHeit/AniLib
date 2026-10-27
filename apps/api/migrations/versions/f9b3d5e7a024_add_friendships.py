"""add friendships

Revision ID: f9b3d5e7a024
Revises: e8a2c4d6f913
Create Date: 2026-10-27 04:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f9b3d5e7a024"
down_revision: str | Sequence[str] | None = "e8a2c4d6f913"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users", sa.Column("share_activity", sa.Boolean(), server_default="true", nullable=False)
    )
    op.create_table(
        "friendships",
        sa.Column("requester_id", sa.Uuid(), nullable=False),
        sa.Column("addressee_id", sa.Uuid(), nullable=False),
        sa.Column("accepted", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["requester_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["addressee_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("requester_id", "addressee_id"),
    )
    op.create_index("ix_friendships_addressee_id", "friendships", ["addressee_id"])
    op.create_index(
        "ix_friendships_pair",
        "friendships",
        [
            sa.text("least(requester_id, addressee_id)"),
            sa.text("greatest(requester_id, addressee_id)"),
        ],
        unique=True,
    )


def downgrade() -> None:
    op.drop_table("friendships")
    op.drop_column("users", "share_activity")
