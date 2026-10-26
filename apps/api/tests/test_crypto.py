from datetime import timedelta

from sqlalchemy import text

from app.crypto import FERNET_PREFIX, decrypt, encrypt
from app.db import utcnow
from app.models import MalLink
from tests.conftest import make_user


def test_round_trip_and_ciphertext_differs():
    token = encrypt("secret-token")
    assert token != "secret-token"
    assert token.startswith(FERNET_PREFIX)
    assert decrypt(token) == "secret-token"


async def test_mal_tokens_are_encrypted_in_the_database(client, session):
    user, _ = await make_user(session, "kafka")
    user_id = user.id
    session.add(
        MalLink(
            user_id=user.id,
            access_token="plain-access",
            refresh_token="plain-refresh",
            expires_at=utcnow() + timedelta(hours=1),
        )
    )
    await session.commit()

    raw = (await session.execute(text("SELECT access_token, refresh_token FROM mal_links"))).one()
    assert "plain" not in raw.access_token + raw.refresh_token

    session.expire_all()
    link = await session.get(MalLink, user_id)
    assert link is not None
    assert (link.access_token, link.refresh_token) == ("plain-access", "plain-refresh")
