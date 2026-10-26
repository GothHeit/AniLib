"""Admin commands: python -m app.cli invite | promote <username>"""

import argparse
import asyncio

from sqlalchemy import select

from app import db
from app.config import get_settings
from app.models import User
from app.routers.invites import new_invite


async def _invite(days: int) -> None:
    async for session in db.get_session():
        invite = new_invite(days)
        session.add(invite)
        await session.commit()
        print(f"Invite code: {invite.code} (valid {days} days)")


async def _promote(username: str) -> None:
    async for session in db.get_session():
        user = await session.scalar(select(User).where(User.username == username.lower()))
        if user is None:
            raise SystemExit(f"No user named {username}")
        user.is_admin = True
        await session.commit()
        print(f"{user.username} is now an admin")


def main() -> None:
    parser = argparse.ArgumentParser(prog="app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    invite = commands.add_parser("invite", help="create an invite code")
    invite.add_argument("--days", type=int, default=7)
    promote = commands.add_parser("promote", help="make a user an admin")
    promote.add_argument("username")
    args = parser.parse_args()

    async def run() -> None:
        db.init_engine(get_settings().database_url)
        try:
            if args.command == "invite":
                await _invite(args.days)
            else:
                await _promote(args.username)
        finally:
            await db.dispose_engine()

    asyncio.run(run())


if __name__ == "__main__":
    main()
