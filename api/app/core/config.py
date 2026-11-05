from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    cors_allow_origins: list[str]
    database_url: str
    sql_echo: bool = False

    upload_dir: str = "uploads"
    max_file_size: int = 10 * 1024 * 1024
    allowed_extensions: list[str] = [".pdf", ".md", ".txt"]

    openai_api_key: str | None = None
    embedding_model: str = "text-embedding-3-small"

    # Claude writes the answers (embeddings stay on OpenAI)
    claude_api_key: str | None = None
    llm_model: str = "claude-opus-5-5"

    # File storage: a private S3 bucket (app/services/storage.py)
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_region: str = "eu-west-3"
    s3_bucket: str | None = None
    presigned_url_expires: int = 300  # seconds a preview/download link stays valid

    secret_key: str
    session_cookie_name: str = "cw_session"
    session_max_age_days: int = 90
    cookie_secure: bool = False

    # Limits (rate limits are per process, in memory)
    max_projects_per_user: int = 5
    max_documents_per_project: int = 10
    max_messages_per_minute: int = 10
    max_requests_per_minute: int = 120
    max_guests_per_ip_per_hour: int = 10

    model_config = SettingsConfigDict(env_file=".env")


def get_settings() -> Settings:
    return Settings()
