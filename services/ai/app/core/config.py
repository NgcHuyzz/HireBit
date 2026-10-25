from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="AI_", env_file=".env", extra="ignore")

    database_url: str = Field(pattern=r"^postgres(ql)?://")
    redis_url: str = Field(pattern=r"^rediss?://")
    service_name: str = "hirebit-ai"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]  # Required values come from environment.
