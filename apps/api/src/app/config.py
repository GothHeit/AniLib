from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Product name in one place: it may still change.
    app_name: str = "MoonRoom"

    database_url: str = "postgresql+asyncpg://app:app@localhost:5432/app"

    # Required: the app refuses to start without it, instead of failing at first login.
    jwt_secret: str = Field(min_length=32)
    access_token_minutes: int = 15
    refresh_token_days: int = 30
    playback_token_minutes: int = 360

    # Comma-separated list of browser origins allowed to call the API.
    cors_origins: str = "http://localhost:3000"
    web_url: str = "http://localhost:3000"

    mal_client_id: str = ""
    mal_client_secret: str = ""
    mal_redirect_uri: str = "http://localhost:8000/mal/callback"

    # Video sources to enable, by name. Empty in a public deployment.
    video_sources: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def video_source_names(self) -> list[str]:
        return [s.strip() for s in self.video_sources.split(",") if s.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
