"""encrypt mal tokens

Revision ID: a3c1d4e5f601
Revises: 559af38f010d
Create Date: 2026-10-26 21:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

from app.crypto import FERNET_PREFIX, decrypt, encrypt

# revision identifiers, used by Alembic.
revision: str = "a3c1d4e5f601"
down_revision: str | Sequence[str] | None = "559af38f010d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _rewrite(convert, already) -> None:
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT user_id, access_token, refresh_token FROM mal_links"))
    for user_id, access, refresh in rows.fetchall():
        conn.execute(
            sa.text(
                "UPDATE mal_links SET access_token = :a, refresh_token = :r WHERE user_id = :u"
            ),
            {
                "u": user_id,
                "a": access if already(access) else convert(access),
                "r": refresh if already(refresh) else convert(refresh),
            },
        )


def upgrade() -> None:
    """Encrypt the plaintext tokens stored by the initial schema."""
    _rewrite(encrypt, lambda v: v.startswith(FERNET_PREFIX))


def downgrade() -> None:
    _rewrite(decrypt, lambda v: not v.startswith(FERNET_PREFIX))
