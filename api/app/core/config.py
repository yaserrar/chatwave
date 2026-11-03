import os
from dotenv import load_dotenv
from pydantic import BaseSettings, SettingsConfigDict

load_dotenv()

class Settings(BaseSettings):
    cors_allow_origins: list[str] = [origin.strip() for origin in os.getenv("CORS_ALLOW_ORIGINS", "").split(",")]
    
    model_config = SettingsConfigDict(env_file=".env")


def get_settings() -> Settings:
    return Settings()
