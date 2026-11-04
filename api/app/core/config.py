from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    cors_allow_origins: list[str]
    database_url: str
    model_config = SettingsConfigDict(env_file=".env")


def get_settings() -> Settings:
    return Settings()
