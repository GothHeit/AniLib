from typing import Annotated

from fastapi import APIRouter, Query, Request

from app.deps import CurrentUser
from app.mal.client import MalClient

router = APIRouter(prefix="/anime", tags=["anime"])


def _mal(request: Request) -> MalClient:
    return request.app.state.mal


@router.get("/seasonal")
async def seasonal(request: Request, user: CurrentUser, page: Annotated[int, Query(ge=1)] = 1):
    return await _mal(request).seasonal(page, user.show_nsfw)


@router.get("/search")
async def search(
    request: Request, user: CurrentUser, q: Annotated[str, Query(min_length=1, max_length=100)]
):
    return await _mal(request).search(q, user.show_nsfw)


@router.get("/top")
async def top(request: Request, user: CurrentUser):
    return await _mal(request).top(user.show_nsfw)


@router.get("/{anime_id}")
async def details(request: Request, anime_id: int, user: CurrentUser):
    return await _mal(request).details(anime_id)
