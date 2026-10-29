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
    # Language of `synopsis`: "pt" when a Portuguese text was found, else the catalog's English.
    synopsis_lang: Literal["en", "pt"] | None = None
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


class StreamOption(BaseModel):
    """One way to play a title: a source and its sub or dub."""

    source: str = Field(min_length=1, max_length=40)
    lang: Literal["sub", "dub"]


class EpisodeArtOut(BaseModel):
    title: str | None = None
    image: str | None = None


class TitleArtOut(BaseModel):
    """Art from outside the catalog, for the title page. Every part may be missing."""

    # A wide picture of the show, for the page's header.
    backdrop: str | None = None
    # Episode number -> its title (in the asked language when known) and still image.
    episodes: dict[int, EpisodeArtOut] = Field(default_factory=dict)


class SourcesOut(BaseModel):
    # Names of the enabled VideoSources that have this title. A hint: it can be stale.
    sources: list[str]
    # What the user last picked in the player for this title, when that source still has it.
    choice: StreamOption | None = None


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
    id: Literal["continue_watching", "my_list", "friends_popular", "seasonal", "top", "genre"]
    # Set on genre rows only: the MAL genre, named in English (the web translates it).
    genre: GenreOut | None = None
    items: list[HomeItem]


class HomeHero(BaseModel):
    anime: AnimeCard
    synopsis: str | None = None
    synopsis_lang: Literal["en", "pt"] | None = None
    # A portrait picture: the catalog's.
    backdrop: str | None = None
    # A wide picture of the show from ani.zip, when it has one.
    wide_art: str | None = None


class HomeOut(BaseModel):
    heroes: list[HomeHero]
    rows: list[HomeRow]
