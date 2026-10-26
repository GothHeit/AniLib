"""MyAnimeList's anime genres. The v2 API has no endpoint for them, and ids are stable."""

from typing import Literal, NamedTuple


class GenreInfo(NamedTuple):
    id: int
    name: str
    kind: Literal["genre", "demographic"]
    nsfw: bool = False


GENRES: tuple[GenreInfo, ...] = (
    GenreInfo(1, "Action", "genre"),
    GenreInfo(2, "Adventure", "genre"),
    GenreInfo(5, "Avant Garde", "genre"),
    GenreInfo(46, "Award Winning", "genre"),
    GenreInfo(28, "Boys Love", "genre"),
    GenreInfo(4, "Comedy", "genre"),
    GenreInfo(8, "Drama", "genre"),
    GenreInfo(10, "Fantasy", "genre"),
    GenreInfo(26, "Girls Love", "genre"),
    GenreInfo(47, "Gourmet", "genre"),
    GenreInfo(14, "Horror", "genre"),
    GenreInfo(7, "Mystery", "genre"),
    GenreInfo(22, "Romance", "genre"),
    GenreInfo(24, "Sci-Fi", "genre"),
    GenreInfo(36, "Slice of Life", "genre"),
    GenreInfo(30, "Sports", "genre"),
    GenreInfo(37, "Supernatural", "genre"),
    GenreInfo(41, "Suspense", "genre"),
    GenreInfo(9, "Ecchi", "genre", nsfw=True),
    GenreInfo(49, "Erotica", "genre", nsfw=True),
    GenreInfo(12, "Hentai", "genre", nsfw=True),
    GenreInfo(15, "Kids", "demographic"),
    GenreInfo(43, "Josei", "demographic"),
    GenreInfo(25, "Shoujo", "demographic"),
    GenreInfo(42, "Seinen", "demographic"),
    GenreInfo(27, "Shounen", "demographic"),
)

GENRE_IDS = {g.id: g for g in GENRES}
