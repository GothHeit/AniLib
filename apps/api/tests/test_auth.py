from sqlalchemy import select

from app.models import User
from tests.conftest import make_user


async def register(client, code, username="Kafka", password="password123"):
    return await client.post(
        "/auth/register",
        json={
            "username": username,
            "password": password,
            "invite_code": code,
            "locale": "en",
        },
    )


async def test_register_needs_a_valid_invite(client):
    r = await register(client, "nope")
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "invalid_invite"


async def test_register_consumes_the_invite(client, invite_code, session):
    r = await register(client, invite_code)
    assert r.status_code == 201
    tokens = r.json()
    assert tokens["access_token"] and tokens["refresh_token"]

    user = await session.scalar(select(User))
    assert user.username == "kafka"
    assert user.locale == "en"

    again = await register(client, invite_code, username="other")
    assert again.json()["error"]["code"] == "invalid_invite"


async def test_usernames_are_case_insensitive(client, invite_code, session):
    await make_user(session, "kafka")
    r = await register(client, invite_code, username="KAFKA")
    assert r.status_code == 409


async def test_register_validates_input(client, invite_code):
    assert (await register(client, invite_code, username="")).status_code == 422
    assert (await register(client, invite_code, password="short")).status_code == 422


async def test_login(client, session):
    await make_user(session, "kafka")
    ok = await client.post("/auth/login", json={"username": "Kafka", "password": "password123"})
    assert ok.status_code == 200
    bad = await client.post("/auth/login", json={"username": "kafka", "password": "wrong"})
    assert bad.status_code == 401
    assert bad.json()["error"]["code"] == "invalid_credentials"


async def test_missing_token_is_401_not_422(client):
    r = await client.get("/me")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "not_authenticated"


async def test_refresh_rotates_and_detects_reuse(client, session):
    await make_user(session, "kafka")
    first = (
        await client.post("/auth/login", json={"username": "kafka", "password": "password123"})
    ).json()

    rotated = await client.post("/auth/refresh", json={"refresh_token": first["refresh_token"]})
    assert rotated.status_code == 200
    second = rotated.json()

    # Reusing the old token is treated as theft and kills the newer one too.
    reused = await client.post("/auth/refresh", json={"refresh_token": first["refresh_token"]})
    assert reused.status_code == 401
    after = await client.post("/auth/refresh", json={"refresh_token": second["refresh_token"]})
    assert after.status_code == 401


async def test_logout_revokes_refresh_token(client, session):
    await make_user(session, "kafka")
    tokens = (
        await client.post("/auth/login", json={"username": "kafka", "password": "password123"})
    ).json()
    assert (
        await client.post("/auth/logout", json={"refresh_token": tokens["refresh_token"]})
    ).status_code == 204
    r = await client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert r.status_code == 401


async def test_update_me(client, session):
    _, headers = await make_user(session, "kafka")
    r = await client.patch("/me", json={"locale": "en", "show_nsfw": True}, headers=headers)
    assert r.status_code == 200
    assert r.json()["locale"] == "en" and r.json()["show_nsfw"] is True
    assert (await client.patch("/me", json={"locale": "fr"}, headers=headers)).status_code == 422


async def test_only_admins_create_invites(client, session):
    _, user_headers = await make_user(session, "friend")
    _, admin_headers = await make_user(session, "kafka", admin=True)
    assert (await client.post("/invites", json={}, headers=user_headers)).status_code == 403
    r = await client.post("/invites", json={"days_valid": 3}, headers=admin_headers)
    assert r.status_code == 201
    listed = await client.get("/invites", headers=admin_headers)
    assert [i["code"] for i in listed.json()] == [r.json()["code"]]
