"""add avatars

Revision ID: e8a2c4d6f913
Revises: d6f4a8b3c5e2
Create Date: 2026-10-27 03:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e8a2c4d6f913"
down_revision: str | Sequence[str] | None = "d6f4a8b3c5e2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_preset", sa.String(length=16), nullable=True))
    op.add_column(
        "users", sa.Column("avatar_uploaded", sa.Boolean(), server_default="false", nullable=False)
    )
    op.add_column(
        "users", sa.Column("avatar_version", sa.Integer(), server_default="0", nullable=False)
    )


def downgrade() -> None:
    op.drop_column("users", "avatar_version")
    op.drop_column("users", "avatar_uploaded")
    op.drop_column("users", "avatar_preset")
