from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    cors_allow_origins: list[str]
    database_url: str

    upload_dir: str = "uploads"
    max_file_size: int = 10 * 1024 * 1024 
    allowed_extensions: list[str] = [".pdf", ".md", ".txt"]

    openai_api_key: str | None = None
    embedding_model: str = "text-embedding-3-small"

    model_config = SettingsConfigDict(env_file=".env")


def get_settings() -> Settings:
    return Settings()
