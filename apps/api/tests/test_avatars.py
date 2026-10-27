import io

import pytest
from PIL import Image

from app.config import get_settings
from app.db import utcnow
from app.models import MalLink
from tests.conftest import make_user


@pytest.fixture(autouse=True)
def avatar_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(get_settings(), "avatar_dir", str(tmp_path))
    return tmp_path


def image_bytes(fmt="PNG", size=(600, 300), color=(200, 40, 40)):
    out = io.BytesIO()
    Image.new("RGB", size, color).save(out, fmt)
    return out.getvalue()


async def test_new_user_has_no_picture(client, session):
    _, headers = await make_user(session)
    me = (await client.get("/me", headers=headers)).json()
    assert me["avatar"]["kind"] == "none"


async def test_upload_is_cropped_to_a_square_webp(client, session):
    user, headers = await make_user(session)
    r = await client.put("/me/avatar", content=image_bytes(), headers=headers)
    assert r.status_code == 200
    assert r.json()["avatar"] == {"kind": "upload", "preset": None, "version": 1, "url": None}
    served = await client.get(f"/users/{user.id}/avatar", headers=headers)
    assert served.status_code == 200
    assert served.headers["content-type"] == "image/webp"
    image = Image.open(io.BytesIO(served.content))
    assert image.format == "WEBP" and image.size == (256, 256)


async def test_other_users_can_see_it_but_anonymous_cannot(client, session):
    owner, owner_headers = await make_user(session, "kafka")
    _, friend_headers = await make_user(session, "friend")
    await client.put("/me/avatar", content=image_bytes("JPEG"), headers=owner_headers)
    assert (
        await client.get(f"/users/{owner.id}/avatar", headers=friend_headers)
    ).status_code == 200
    assert (await client.get(f"/users/{owner.id}/avatar")).status_code == 401


async def test_reupload_bumps_the_version(client, session):
    _, headers = await make_user(session)
    await client.put("/me/avatar", content=image_bytes(), headers=headers)
    r = await client.put("/me/avatar", content=image_bytes("WEBP"), headers=headers)
    assert r.json()["avatar"]["version"] == 2


@pytest.mark.parametrize("content", [b"", b"not an image", b"GIF89a" + b"\x00" * 40])
async def test_rejects_non_images(client, session, content):
    _, headers = await make_user(session)
    r = await client.put("/me/avatar", content=content, headers=headers)
    assert r.status_code == 415
    assert r.json()["error"]["code"] == "avatar_type"


async def test_rejects_other_formats(client, session):
    _, headers = await make_user(session)
    r = await client.put("/me/avatar", content=image_bytes("GIF"), headers=headers)
    assert r.status_code == 415


async def test_rejects_big_files(client, session):
    _, headers = await make_user(session)
    r = await client.put("/me/avatar", content=b"\x00" * (2 * 1024 * 1024 + 1), headers=headers)
    assert r.status_code == 413
    assert r.json()["error"]["code"] == "avatar_too_large"


async def test_preset_replaces_the_upload(client, session, avatar_dir):
    user, headers = await make_user(session)
    await client.put("/me/avatar", content=image_bytes(), headers=headers)
    r = await client.put("/me/avatar/preset", json={"preset": "moon-3"}, headers=headers)
    assert r.json()["avatar"]["kind"] == "preset"
    assert r.json()["avatar"]["preset"] == "moon-3"
    assert not list(avatar_dir.iterdir())
    assert (await client.get(f"/users/{user.id}/avatar", headers=headers)).status_code == 404


async def test_unknown_preset_is_refused(client, session):
    _, headers = await make_user(session)
    r = await client.put("/me/avatar/preset", json={"preset": "../etc"}, headers=headers)
    assert r.status_code == 422


async def test_remove_falls_back_to_mal_then_initial(client, session):
    user, headers = await make_user(session)
    session.add(
        MalLink(
            user_id=user.id,
            access_token="a",
            refresh_token="r",
            expires_at=utcnow(),
            mal_username="kafka",
            mal_picture="https://cdn.myanimelist.net/me.jpg",
        )
    )
    await session.commit()
    me = (await client.get("/me", headers=headers)).json()
    assert me["avatar"]["kind"] == "mal"
    await client.put("/me/avatar", content=image_bytes(), headers=headers)
    me = (await client.delete("/me/avatar", headers=headers)).json()
    assert me["avatar"] == {
        "kind": "mal",
        "preset": None,
        "version": 0,
        "url": "https://cdn.myanimelist.net/me.jpg",
    }


async def test_version_never_goes_back_so_caches_cannot_serve_an_old_picture(client, session):
    _, headers = await make_user(session)
    await client.put("/me/avatar", content=image_bytes(), headers=headers)
    await client.delete("/me/avatar", headers=headers)
    r = await client.put("/me/avatar", content=image_bytes(), headers=headers)
    assert r.json()["avatar"]["version"] == 2


async def test_corrupt_image_is_a_415_not_a_500(client, session):
    _, headers = await make_user(session)
    good = image_bytes()
    r = await client.put("/me/avatar", content=good[: len(good) // 2], headers=headers)
    assert r.status_code == 415


async def test_too_many_pixels_is_refused(client, session):
    _, headers = await make_user(session)
    big = image_bytes(size=(4000, 4000))
    r = await client.put("/me/avatar", content=big, headers=headers)
    assert r.status_code == 413
    assert r.json()["error"]["code"] == "avatar_dimensions"


async def test_changing_the_picture_needs_a_login(client):
    assert (await client.put("/me/avatar", content=b"x")).status_code == 401
    assert (await client.delete("/me/avatar")).status_code == 401


async def test_unknown_user_has_no_picture(client, session):
    import uuid

    _, headers = await make_user(session)
    assert (await client.get(f"/users/{uuid.uuid4()}/avatar", headers=headers)).status_code == 404
