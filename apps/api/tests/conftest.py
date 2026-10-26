import os

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://app:app@localhost:5432/app_test")
os.environ.setdefault("JWT_SECRET", "test-secret-that-is-at-least-32-characters")
os.environ.setdefault("MAL_CLIENT_ID", "test-client-id")
os.environ.setdefault("TOKEN_ENCRYPTION_KEY", "U7IyWg9977JGpiW4T6DkGZvteDb8a_l1bU8cy-JhLmc=")

from pathlib import Path  # noqa: E402

import httpx  # noqa: E402
import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app import db  # noqa: E402
from app.main import app as fastapi_app  # noqa: E402
from app.models import User  # noqa: E402
from app.routers.invites import new_invite  # noqa: E402
from app.security import create_access_token  # noqa: E402

API_DIR = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session", autouse=True)
def migrated_database():
    # Build the schema through the real migrations, so they are tested too.
    cfg = Config(str(API_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL"])
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")


@pytest.fixture
async def client():
    async with fastapi_app.router.lifespan_context(fastapi_app):
        async for session in db.get_session():
            await session.execute(
                text("TRUNCATE users, invites, refresh_tokens, mal_links, mal_oauth_states CASCADE")
            )
            await session.commit()
        transport = httpx.ASGITransport(app=fastapi_app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            yield c


@pytest.fixture
async def session(client):
    async for s in db.get_session():
        yield s


@pytest.fixture
async def invite_code(session):
    invite = new_invite(7)
    session.add(invite)
    await session.commit()
    return invite.code


async def make_user(session, username="kafka", admin=False, nsfw=False) -> tuple[User, dict]:
    from app.security import hash_password

    user = User(
        username=username,
        password_hash=hash_password("password123"),
        is_admin=admin,
        show_nsfw=nsfw,
    )
    session.add(user)
    await session.commit()
    return user, {"Authorization": f"Bearer {create_access_token(user.id)}"}
