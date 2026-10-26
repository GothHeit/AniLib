import httpx
import respx

from app.mal.client import API_BASE, current_season


def node(anime_id, title="Show", genres=(), **extra):
    return {
        "id": anime_id,
        "title": title,
        "main_picture": {
            "medium": f"https://img/{anime_id}m.jpg",
            "large": f"https://img/{anime_id}l.jpg",
        },
        "mean": 7.0,
        "num_list_users": 1000 - anime_id,
        "genres": [{"id": g, "name": f"g{g}"} for g in genres],
        **extra,
    }


def listing(*nodes, **paging):
    return {"data": [{"node": n} for n in nodes], "paging": paging}


def mock_season(*nodes, year=None, season=None):
    y, s = current_season()
    return respx.get(f"{API_BASE}/anime/season/{year or y}/{season or s}").mock(
        return_value=httpx.Response(200, json=listing(*nodes))
    )


def mock_ranking(*nodes):
    return respx.get(f"{API_BASE}/anime/ranking").mock(
        return_value=httpx.Response(200, json=listing(*nodes))
    )


def mock_details(anime_id, **fields):
    body = {**node(anime_id, f"Show {anime_id}"), **fields}
    return respx.get(f"{API_BASE}/anime/{anime_id}").mock(
        return_value=httpx.Response(200, json=body)
    )
