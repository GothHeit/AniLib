import uuid

import pytest

from app.errors import ApiError
from app.main import app
from app.rooms import MAX_MEMBERS, Room, Rooms
from tests.conftest import make_user


def drain(queue):
    events = []
    while not queue.empty():
        events.append(queue.get_nowait())
    return events


def new_room() -> tuple[Room, uuid.UUID]:
    host = uuid.uuid4()
    return Rooms().create(host, "zoko", 21, "One Piece", 1, "sub"), host


async def test_join_sends_the_state_and_tells_the_others():
    room, host = new_room()
    first = room.join(host, "kafka")
    assert drain(first)[0][0] == "state"
    guest = uuid.uuid4()
    room.join(guest, "friend")
    kind, data = drain(first)[0]
    assert kind == "state"
    assert [m["username"] for m in data["members"]] == ["kafka", "friend"]


async def test_the_room_holds_ten_people_and_a_second_tab_does_not_count():
    room, host = new_room()
    room.join(host, "kafka")
    for i in range(MAX_MEMBERS - 1):
        room.join(uuid.uuid4(), f"user{i}")
    with pytest.raises(ApiError) as full:
        room.join(uuid.uuid4(), "late")
    assert full.value.code == "room_full"
    room.join(host, "kafka")


async def test_play_pause_and_seek_reach_everyone():
    room, host = new_room()
    q1 = room.join(host, "kafka")
    guest = uuid.uuid4()
    q2 = room.join(guest, "friend")
    drain(q1), drain(q2)
    room.control(guest, "play", 10)
    room.control(host, "seek", 300)
    events = drain(q1)
    assert [e[0] for e in events] == ["playback", "playback"]
    assert events[0][1]["playing"] is True
    assert events[1][1]["position"] >= 300
    room.control(guest, "pause", 301)
    assert drain(q2)[-1][1] == {"playing": False, "position": 301, "by": str(guest)}


async def test_locked_controls_are_host_only():
    room, host = new_room()
    room.join(host, "kafka")
    guest = uuid.uuid4()
    room.join(guest, "friend")
    with pytest.raises(ApiError):
        room.set_locked(guest, True)
    room.set_locked(host, True)
    with pytest.raises(ApiError) as locked:
        room.control(guest, "pause", 0)
    assert locked.value.code == "controls_locked"
    room.control(host, "pause", 0)


async def test_strangers_cannot_act():
    room, host = new_room()
    room.join(host, "kafka")
    with pytest.raises(ApiError) as error:
        room.say(uuid.uuid4(), "hi")
    assert error.value.code == "not_in_room"


async def test_episode_changes_by_majority_and_the_host_overrides():
    room, host = new_room()
    room.join(host, "kafka")
    a, b, c = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    for user, name in ((a, "a"), (b, "b"), (c, "c")):
        room.join(user, name)
    room.vote_episode(a, 2)
    assert room.episode == 1
    room.vote_episode(b, 2)
    assert room.episode == 1  # 2 of 4 is not a majority
    room.vote_episode(c, 2)
    assert room.episode == 2
    assert room.votes == {}
    assert room.playing and room.now_position() < 1
    room.vote_episode(host, 5)
    assert room.episode == 5


async def test_a_vote_leaves_with_its_voter_and_can_be_withdrawn():
    room, host = new_room()
    room.join(host, "kafka")
    a, b = uuid.uuid4(), uuid.uuid4()
    qa = room.join(a, "a")
    room.join(b, "b")
    room.vote_episode(a, 3)
    room.withdraw_vote(a)
    assert room.votes == {}
    room.vote_episode(a, 3)
    room.leave(a, qa)
    assert room.votes == {}


async def test_the_host_passes_to_the_next_person_and_an_empty_room_is_swept():
    rooms = Rooms()
    host, guest = uuid.uuid4(), uuid.uuid4()
    room = rooms.create(host, "zoko", 21, "One Piece", 1, "sub")
    q1 = room.join(host, "kafka")
    room.join(guest, "friend")
    room.leave(host, q1)
    assert room.host_id == host  # a reload doesn't cost the host the room
    room._pass_host(host)
    assert room.host_id == guest
    room.empty_since = 0.0
    rooms.sweep()
    assert len(rooms) == 1  # not empty, so kept
    room.leave(guest, next(iter(room.members[guest].queues)))
    room.empty_since = 0.0
    rooms.sweep()
    assert len(rooms) == 0


async def test_chat_is_trimmed_kept_for_latecomers_and_reactions_are_not():
    room, host = new_room()
    room.join(host, "kafka")
    room.say(host, "  hello  ")
    room.react(host, "🔥")
    with pytest.raises(ApiError):
        room.say(host, "   ")
    with pytest.raises(ApiError):
        room.react(host, "💩")
    late = room.join(uuid.uuid4(), "late")
    chats = [data for kind, data in drain(late) if kind == "chat"]
    assert [c["text"] for c in chats] == ["hello"]


async def test_the_api_creates_and_runs_a_room(client, session):
    _, host_headers = await make_user(session, "kafka")
    guest, guest_headers = await make_user(session, "friend")
    app.state.sources = {"zoko": object()}

    created = await client.post(
        "/watch/rooms",
        json={"source": "zoko", "anime_id": 21, "title": "One Piece", "episode": 1},
        headers=host_headers,
    )
    assert created.status_code == 201
    code = created.json()["code"]

    found = await client.get(f"/watch/rooms/{code.lower()}", headers=guest_headers)
    assert found.status_code == 200
    missing = await client.get("/watch/rooms/NOPE00", headers=guest_headers)
    assert missing.status_code == 404

    queue = app.state.rooms.get(code).join(guest.id, "friend")
    drain(queue)
    chat = await client.post(
        f"/watch/rooms/{code}/chat", json={"text": "hi"}, headers=guest_headers
    )
    assert chat.status_code == 204
    assert drain(queue)[0][1]["text"] == "hi"

    stranger = await client.post(
        f"/watch/rooms/{code}/control", json={"action": "play"}, headers=host_headers
    )
    assert stranger.status_code == 403 and stranger.json()["error"]["code"] == "not_in_room"

    locked = await client.put(
        f"/watch/rooms/{code}/lock", json={"locked": True}, headers=guest_headers
    )
    assert locked.status_code == 403


async def test_creating_a_room_needs_login_and_an_enabled_source(client, session):
    body = {"source": "nope", "anime_id": 21, "title": "One Piece", "episode": 1}
    assert (await client.post("/watch/rooms", json=body)).status_code == 401
    _, headers = await make_user(session, "kafka")
    app.state.sources = {}
    missing = await client.post("/watch/rooms", json=body, headers=headers)
    assert missing.status_code == 404


async def test_a_host_who_comes_back_keeps_the_room():
    room, host = new_room()
    q1 = room.join(host, "kafka")
    room.join(uuid.uuid4(), "friend")
    room.leave(host, q1)
    room.join(host, "kafka")
    room._pass_host(host)
    assert room.host_id == host


async def test_a_vote_that_becomes_a_majority_when_someone_leaves_switches():
    room, host = new_room()
    room.join(host, "kafka")
    a, b, c = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    room.join(a, "a")
    room.join(b, "b")
    qc = room.join(c, "c")
    room.vote_episode(a, 2)
    room.vote_episode(b, 2)
    assert room.episode == 1
    room.leave(c, qc)
    assert room.episode == 2


async def test_one_person_cannot_hold_many_rooms():
    rooms = Rooms()
    host = uuid.uuid4()
    for _ in range(3):
        rooms.create(host, "zoko", 21, "One Piece", 1, "sub")
    with pytest.raises(ApiError) as error:
        rooms.create(host, "zoko", 21, "One Piece", 1, "sub")
    assert error.value.code == "too_many_rooms"
