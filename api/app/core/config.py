from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    cors_allow_origins: list[str]
    database_url: str
    upload_dir :  str = "uploads"
    model_config = SettingsConfigDict(env_file=".env")


def get_settings() -> Settings:
    return Settings()
