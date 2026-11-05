# Chatwave

Chat with your documents. Chatwave is a Retrieval-Augmented Generation (RAG) app: upload PDF, Markdown or text files into a project, ask questions, and get answers with citations (file and page).

## How it works

1. **Index**: files are split into ~2000-character chunks (200 overlap), embedded with OpenAI `text-embedding-3-small` (1536 dims) and stored in PostgreSQL with pgvector.
2. **Answer**: a question is embedded, the top 5 closest chunks of that project are retrieved by cosine distance, and Claude writes an answer using only those excerpts, citing them as `[n]`.

Visitors continue as anonymous guests (no sign-up). A signed httpOnly cookie identifies the guest, and every project is scoped to its creator.

## Stack

- **Web**: React, TypeScript, Vite, TanStack Router and Query, Tailwind CSS v4 (`web/`)
- **API**: FastAPI, async SQLAlchemy, Alembic, PostgreSQL + pgvector (`api/`)
- **AI**: OpenAI embeddings, Anthropic Claude
- **Storage**: private S3 bucket

## Getting started

Requirements: Python 3.12, Node 20+, PostgreSQL with the `pgvector` extension, an OpenAI key, an Anthropic key and an S3 bucket.

```bash
# API
cd api
python -m venv env && source env/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in the values
alembic upgrade head
uvicorn app.main:app --reload   # http://localhost:8000

# Web (in another terminal)
cd web
cp .env.example .env
npm install
npm run dev                     # http://localhost:5173, proxies /api to the API
```

The frontend proxies `/api` to the backend, so the session cookie is same-origin. Keep that setup in production (serve both behind one domain) and set `COOKIE_SECURE=true` over HTTPS.

## Limits

Configurable in `api/.env` (see `.env.example`): 5 projects per guest, 10 documents per project, 10 chat messages per minute, 120 requests per minute per guest, and 10 new guest sessions per IP per hour. Rate limits are kept in memory, so they are per API process. Behind a reverse proxy, run uvicorn with `--proxy-headers --forwarded-allow-ips=<proxy ip>` so the per-IP limit sees real client addresses.

## Notes

- The Satoshi font in `web/src/assets/fonts/satoshi` is under its own license (see `LICENSE-FFL.txt`), not MIT.

## License

[MIT](./LICENSE)
