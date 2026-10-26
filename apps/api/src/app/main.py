import asyncio
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import db
from app.config import get_settings
from app.errors import install_error_handlers
from app.mal.account import MalAccounts
from app.mal.client import MalClient
from app.ratelimit import AuthLimits
from app.routers import anime, auth, home, invites, mal, progress, watch
from app.sources import load_sources

SWEEP_INTERVAL_SECONDS = 300


async def _sweep_limits(limits: AuthLimits) -> None:
    # Idle rate-limit keys are otherwise only dropped when the same key is seen again.
    while True:
        await asyncio.sleep(SWEEP_INTERVAL_SECONDS)
        limits.sweep()


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    db.init_engine(settings.database_url)
    async with httpx.AsyncClient(follow_redirects=True) as http:
        app.state.http = http
        app.state.mal = MalClient(settings.mal_client_id, http)
        app.state.mal_accounts = MalAccounts(settings, http)
        app.state.auth_limits = AuthLimits(settings)
        app.state.source_hints = anime.new_source_hints()
        app.state.sources = load_sources(settings.video_source_names)
        sweeper = asyncio.create_task(_sweep_limits(app.state.auth_limits))
        try:
            yield
        finally:
            sweeper.cancel()
    await db.dispose_engine()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=f"{settings.app_name} API", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    install_error_handlers(app)

    @app.get("/health", tags=["meta"])
    async def health():
        return {"status": "ok"}

    for module in (auth, invites, anime, mal, watch, progress, home):
        app.include_router(module.router)
    return app


app = create_app()
