"""Response models for the anime endpoints.

MyAnimeList answers with loosely shaped JSON; these models keep only what the clients use and
flatten MAL's `{"node": {...}}` wrappers, so the generated OpenAPI client is accurate.
"""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class Picture(BaseModel):
    medium: str | None = None
    large: str | None = None


class AlternativeTitles(BaseModel):
    en: str | None = None
    ja: str | None = None
    synonyms: list[str] = Field(default_factory=list)


class Genre(BaseModel):
    id: int
    name: str


class StartSeason(BaseModel):
    year: int
    season: str


class AnimeCard(BaseModel):
    """What a poster needs."""

    id: int
    title: str
    alternative_titles: AlternativeTitles | None = None
    main_picture: Picture | None = None
    mean: float | None = None
    media_type: str | None = None
    num_episodes: int | None = None
    start_season: StartSeason | None = None
    rating: str | None = None
    genres: list[Genre] = Field(default_factory=list)

    @classmethod
    def from_node(cls, node: dict[str, Any]) -> "AnimeCard":
        return cls.model_validate(node)


class AnimeListOut(BaseModel):
    data: list[AnimeCard]


class SeasonalOut(AnimeListOut):
    year: int
    season: str
    has_next: bool


class BrowseOut(AnimeListOut):
    page: int
    has_next: bool


class GenreOut(Genre):
    # Demographics (Shounen, Seinen...) are genres too; clients may want to group them.
    kind: Literal["genre", "demographic"]
    nsfw: bool


class RelatedAnime(BaseModel):
    relation_type: str
    relation_type_formatted: str
    anime: AnimeCard


class Recommendation(BaseModel):
    anime: AnimeCard
    num_recommendations: int


class Studio(BaseModel):
    id: int
    name: str


class Broadcast(BaseModel):
    day_of_the_week: str | None = None
    start_time: str | None = None


class AnimeDetailsOut(AnimeCard):
    synopsis: str | None = None
    background: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    rank: int | None = None
    popularity: int | None = None
    num_list_users: int | None = None
    num_scoring_users: int | None = None
    status: str | None = None
    source: str | None = None
    average_episode_duration: int | None = None
    broadcast: Broadcast | None = None
    pictures: list[Picture] = Field(default_factory=list)
    studios: list[Studio] = Field(default_factory=list)
    related_anime: list[RelatedAnime] = Field(default_factory=list)
    recommendations: list[Recommendation] = Field(default_factory=list)


class SourcesOut(BaseModel):
    # Names of the enabled VideoSources that have this title. A hint: it can be stale.
    sources: list[str]


class ProgressIn(BaseModel):
    position_seconds: float = Field(ge=0, le=86400)
    duration_seconds: float | None = Field(default=None, gt=0, le=86400)
    # The player may mark an episode done explicitly; the server also derives it near the end.
    completed: bool = False


class ProgressOut(BaseModel):
    anime_id: int
    episode: int
    position_seconds: float
    duration_seconds: float | None
    completed: bool
    updated_at: datetime


class HomeItem(BaseModel):
    anime: AnimeCard
    # Set on the continue-watching row only.
    progress: ProgressOut | None = None
    # Episode to open from this card: the saved one, or the next after a finished one.
    resume_episode: int | None = None


class HomeRow(BaseModel):
    id: Literal["continue_watching", "my_list", "seasonal", "top"]
    items: list[HomeItem]


class HomeHero(BaseModel):
    anime: AnimeCard
    synopsis: str | None = None
    backdrop: str | None = None


class HomeOut(BaseModel):
    hero: HomeHero | None
    rows: list[HomeRow]
