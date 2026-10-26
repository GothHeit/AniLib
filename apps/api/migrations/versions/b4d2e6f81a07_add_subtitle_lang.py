"""add subtitle lang

Revision ID: b4d2e6f81a07
Revises: 90fbddc7e6d7
Create Date: 2026-10-26 23:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b4d2e6f81a07"
down_revision: str | Sequence[str] | None = "90fbddc7e6d7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("subtitle_lang", sa.String(length=8), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "subtitle_lang")
