import os

# The unit tests never touch a database or a paid API, but importing the app reads its settings: give the
# required ones harmless values when api/.env is absent (CI), without overriding a real configuration.
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test")
os.environ.setdefault("CORS_ALLOW_ORIGINS", '["http://localhost:5173"]')
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("SQL_ECHO", "false")
