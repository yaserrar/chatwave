# syntax=docker/dockerfile:1
# Build from the repo root: docker build -f api/Dockerfile api

FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app

FROM base AS deps
COPY requirements.txt .
RUN python -m venv /venv && /venv/bin/pip install -r requirements.txt

FROM base AS runner
COPY --from=deps /venv /venv
ENV PATH="/venv/bin:$PATH"
RUN useradd --create-home --uid 10001 app
COPY --chown=app:app alembic.ini ./
COPY --chown=app:app alembic ./alembic
COPY --chown=app:app app ./app
USER app
EXPOSE 8000
# Apply pending migrations, then start. Safe with one API container; with several,
# run migrations as a separate one-off step instead.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'"]
