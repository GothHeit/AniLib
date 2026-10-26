from tests.conftest import make_user


async def put(client, headers, anime=21, episode=1, **body):
    return await client.put(f"/me/progress/{anime}/{episode}", json=body, headers=headers)


async def test_progress_needs_login(client):
    assert (await client.get("/me/progress")).status_code == 401


async def test_save_and_update_progress(client, session):
    _, headers = await make_user(session, "kafka")
    r = await put(client, headers, position_seconds=120, duration_seconds=1400)
    assert r.status_code == 200
    assert r.json()["position_seconds"] == 120
    assert r.json()["completed"] is False

    # A later save without a duration keeps the known one.
    r = await put(client, headers, position_seconds=300)
    assert r.json()["position_seconds"] == 300
    assert r.json()["duration_seconds"] == 1400
    assert len((await client.get("/me/progress/21", headers=headers)).json()) == 1


async def test_completed_near_the_end_and_it_sticks(client, session):
    _, headers = await make_user(session, "kafka")
    r = await put(client, headers, position_seconds=1300, duration_seconds=1400)
    assert r.json()["completed"] is True
    r = await put(client, headers, position_seconds=10, duration_seconds=1400)
    assert r.json()["completed"] is True

    explicit = await put(client, headers, episode=2, position_seconds=5, completed=True)
    assert explicit.json()["completed"] is True


async def test_continue_watching_is_one_entry_per_anime_newest_first(client, session):
    _, headers = await make_user(session, "kafka")
    await put(client, headers, anime=1, episode=1, position_seconds=10)
    await put(client, headers, anime=2, episode=4, position_seconds=10)
    await put(client, headers, anime=1, episode=2, position_seconds=10)

    entries = (await client.get("/me/progress", headers=headers)).json()
    assert [(e["anime_id"], e["episode"]) for e in entries] == [(1, 2), (2, 4)]

    per_anime = (await client.get("/me/progress/1", headers=headers)).json()
    assert [e["episode"] for e in per_anime] == [1, 2]


async def test_progress_is_private_to_each_user(client, session):
    _, mine = await make_user(session, "kafka")
    _, theirs = await make_user(session, "friend")
    await put(client, mine, position_seconds=10)
    assert (await client.get("/me/progress", headers=theirs)).json() == []


async def test_progress_validates_input(client, session):
    _, headers = await make_user(session, "kafka")
    assert (await put(client, headers, position_seconds=-1)).status_code == 422
    assert (await put(client, headers, position_seconds=1, duration_seconds=0)).status_code == 422
    assert (await put(client, headers, anime=0, position_seconds=1)).status_code == 422
