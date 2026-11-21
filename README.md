# Chatwave

Chat with your documents. Chatwave is a Retrieval-Augmented Generation (RAG) app: upload PDF, Markdown or text files into a project, ask questions, and get answers with citations. Click a citation and the document opens at the cited passage, highlighted. When the documents don't answer a question, Chatwave says so instead of guessing, and every answer shows how strong its evidence was.

## How it works

1. **Upload**: the API stores the file in S3, saves it as `pending`, and publishes a `document.uploaded` event to **RabbitMQ**. It answers right away.
2. **Index**: an **ingestion worker** (a separate process) receives the event, splits the file into ~2000-character chunks (200 overlap), embeds them with OpenAI `text-embedding-3-small` (1536 dims) and stores them in PostgreSQL with pgvector. The document turns `ready`.
3. **Answer**: the question is searched in that project two ways, one after the other, by meaning (pgvector, cosine distance) and by words (Postgres full-text search), and the two rankings are merged with Reciprocal Rank Fusion. The evidence is graded (high, medium, low confidence). If nothing is close in meaning and none of the question's words appear in the documents, the answer is "not in your documents" without calling Claude; otherwise Claude writes an answer from the top 5 passages only (`RETRIEVAL_TOP_K`), citing them as `[n]`, or says the passages don't answer. The answer is streamed to the browser with Server-Sent Events.
4. **Check**: each citation opens the document in a side panel (a bottom sheet on phones) at the right page, with the cited passage highlighted. PDFs are rendered with pdf.js.

Deletes work the same way as uploads: the API removes the rows and publishes an event, and a **cleanup worker** deletes the files from S3. An **activity worker** receives a copy of every event and logs it.

**[ARCHITECTURE.md](ARCHITECTURE.md)** explains the whole design: why RabbitMQ, the exchange and queues, every event, each flow step by step, and what happens when something fails.

Visitors continue as anonymous guests (no sign-up). A signed httpOnly cookie identifies the guest, and every project is scoped to its creator.

## Stack

- **Web**: React, TypeScript, Vite, TanStack Router and Query, Tailwind CSS v4 (`web/`)
- **API**: FastAPI, async SQLAlchemy, Alembic, PostgreSQL + pgvector (`api/`)
- **Messaging**: RabbitMQ (`aio-pika`), with three workers in `api/app/workers/`
- **AI**: OpenAI embeddings, Anthropic Claude
- **Storage**: private S3 bucket

## Getting started

Requirements: Python 3.12, Node 20+, PostgreSQL with the `pgvector` and `unaccent` extensions (`unaccent` ships with Postgres), RabbitMQ, an OpenAI key, an Anthropic key and an S3 bucket. The browser reads files straight from S3 (previews, the citation viewer), so the bucket's CORS rule must allow `GET` from the web app's origin.

```bash
# RabbitMQ (macOS; dashboard at http://localhost:15672, guest / guest)
brew install rabbitmq
brew services start rabbitmq

# API
cd api
python -m venv env && source env/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in the values
alembic upgrade head
uvicorn app.main:app --reload   # http://localhost:8000

# Workers (one terminal each, from api/ with the virtualenv active)
python -m app.workers.ingestion  # processes uploads: without it, documents stay "Queued"
python -m app.workers.cleanup    # deletes S3 files after deletes
python -m app.workers.activity   # optional: logs every event

# Web (in another terminal)
cd web
cp .env.example .env
npm install
npm run dev                     # http://localhost:5173, proxies /api to the API
```

The API refuses to start if RabbitMQ isn't running. A worker that isn't running breaks nothing: its messages wait in RabbitMQ and are processed when it starts.

The frontend proxies `/api` to the backend, so the session cookie is same-origin. Keep that setup in production (serve both behind one domain) and set `COOKIE_SECURE=true` over HTTPS.

## Tests and evaluation

From `api/`, with the virtualenv active:

```bash
pip install -r requirements-dev.txt
pytest                      # unit tests: no database, no paid API
python -m evals.run         # retrieval quality on the evaluation set (OpenAI embeddings, < $0.01)
```

The evaluation harness (`api/evals/`) indexes three made-up documents (`evals/fixtures/`: a Markdown handbook, a PDF API guide, a French text policy) into a throwaway project of the database in `api/.env`, asks the questions of `evals/questions.json` (45 answerable ones with their expected source, 13 the documents don't answer; 24 of the 58 were written after the thresholds were set and are reported apart, as held-out questions), and deletes the project afterwards. It writes [`evals/report.md`](api/evals/report.md):

- **retrieval**: hit rate at 1, 3 and k, and mean reciprocal rank, for vector-only, keyword-only and hybrid search;
- **confidence**: the evidence of every question, the refusal rate on unanswerable questions, and answerable questions wrongly refused, for the calibration and the held-out questions separately.

Options: `--top-k 3`, `--report <path>`, and `--answers` to also run the real answering path with Claude (paid): does the answer cite the expected source, does it say "not found" for unanswerable questions. Add `--only id1,id2` to ask Claude only a few questions. `python -m evals.make_pdf` rebuilds the fixture PDF after editing its text.

Latest results (top-k 5, 13 chunks, so a hit in the top 5 is easy: hit@1 and MRR are what tell the modes apart): hybrid search finds the expected passage first for 84% of the questions (vector 82%, keyword 82%), MRR 0.902 (vector 0.901, keyword 0.877). No answerable question is refused without Claude, neither among the 27 calibration questions nor among the 18 held-out ones (terse ones like "train" or "Quel est le taux kilométrique ?" included). 5 of the 13 unanswerable questions are refused without calling Claude; the others share a word or a topic with the documents and go to Claude, which answered "not found" to every one it was asked.

## Limits

Configurable in `api/.env` (see `.env.example`): 5 projects per guest, 10 documents per project, 10 chat messages per minute, 120 requests per minute per guest, and 10 new guest sessions per IP per hour. Rate limits are kept in memory, so they are per API process. Behind a reverse proxy, run uvicorn with `--proxy-headers --forwarded-allow-ips=<proxy ip>` so the per-IP limit sees real client addresses.

## Notes

- The Satoshi font in `web/src/assets/fonts/satoshi` is under its own license (see `LICENSE-FFL.txt`), not MIT.

## License

[MIT](./LICENSE)
