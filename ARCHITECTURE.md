# Architecture

How Chatwave's pieces fit together: the API, RabbitMQ, the workers, and the services they use. Start with the diagram, then read the flow you care about. The RabbitMQ sections explain the vocabulary as they go.

## The big picture

```mermaid
flowchart LR
  Browser["Browser<br/>(React app)"] -->|"/api"| API["API<br/>(FastAPI)"]

  subgraph RabbitMQ
    EX{{"chatwave.events<br/>topic exchange"}}
    QI[("q.ingestion")]
    QA[("q.activity")]
    QC[("q.cleanup")]
    DX{{"chatwave.dead<br/>fanout exchange"}}
    QD[("q.dead")]
    EX -->|"document.uploaded"| QI
    EX -->|"# (every event)"| QA
    EX -->|"document.deleted<br/>project.deleted"| QC
    DX --> QD
  end

  API -->|publish| EX
  QI --> WI["Ingestion worker"]
  QA --> WA["Activity worker"]
  QC --> WC["Cleanup worker"]
  WI -->|"document.ready / document.failed"| EX
  QI & QA & QC -.->|"rejected after a crash"| DX

  subgraph Services
    PG[("Postgres + pgvector")]
    S3[("S3")]
    OAI["OpenAI<br/>embeddings"]
    CL["Claude<br/>answers"]
  end

  API --- PG & S3 & OAI & CL
  WI --- PG & S3 & OAI
  WC --- S3
```

The rule behind it: **the API answers the browser and never does slow work itself.** When something slow has to happen (reading a PDF, calling OpenAI for hundreds of chunks, deleting files in S3), the API publishes an **event** to RabbitMQ and returns. **Workers**, separate processes running the same code, receive those events and do the work.

| Piece | What it does | Code |
|---|---|---|
| **Web** | React app. Talks only to `/api` on its own domain | `web/` |
| **API** | HTTP routes, auth, chat (streamed with SSE), publishes events | `api/app/main.py`, `api/app/routers/` |
| **RabbitMQ** | Receives events and keeps them in queues until a worker takes them | topology in `api/app/core/events.py` |
| **Ingestion worker** | Turns an uploaded file into searchable chunks | `api/app/workers/ingestion.py` |
| **Cleanup worker** | Deletes files from S3 after a document or project is deleted | `api/app/workers/cleanup.py` |
| **Activity worker** | Logs every event (it gets a copy of all of them) | `api/app/workers/activity.py` |
| **Postgres + pgvector** | Projects, documents, chunks with their embeddings, conversations | `api/app/models/` |
| **S3** | The uploaded files (private bucket) | `api/app/services/storage.py` |
| **OpenAI / Claude** | Embeddings / written answers | `api/app/services/embeddings.py`, `llm.py` |

## Why RabbitMQ

Before RabbitMQ, uploads were processed with FastAPI's `BackgroundTasks`, inside the API process. That had three problems:

1. **Lost work.** If the API restarted during processing (a deploy, a crash), the job disappeared and the document stayed "Processing" forever.
2. **A slower API.** Reading PDFs and embedding chunks used the same process that answers every request.
3. **Silent failures.** Deleting files from S3 happened inside the request. If S3 failed, the error was only logged and the files stayed forever.

With a queue in between:

- **Jobs wait safely.** A message stays in its queue, on disk, until a worker confirms it's done. API restarts, worker restarts, and even RabbitMQ restarts don't lose it.
- **The API stays fast.** Its part ends at "published".
- **Workers scale on their own.** Two ingestion workers on the same queue share the uploads.
- **New consumers cost nothing to add.** The API doesn't know who listens. The activity worker was added without changing a single publisher.

**Chat does not use RabbitMQ.** The person is waiting on screen for the answer, so the API streams it directly from Claude. Queues are for work that can happen a little later.

## RabbitMQ vocabulary

| Word | Meaning | In Chatwave |
|---|---|---|
| **Connection** | One network link to RabbitMQ, opened once and kept | The API opens one at startup; each worker opens its own |
| **Channel** | A lightweight session inside a connection; all work goes through it | One per process |
| **Exchange** | A sorter. Publishers send to an exchange, never directly to a queue | `chatwave.events` |
| **Routing key** | The label on a message, read by the exchange | The event name, e.g. `document.uploaded` |
| **Queue** | A mailbox where messages wait for a consumer | `q.ingestion`, `q.cleanup`, `q.activity` |
| **Binding** | A rule: "this queue wants messages with this routing key" | `q.cleanup` ← `document.deleted` |
| **Consumer** | A program reading one queue | The three workers |
| **Ack** | "Done, delete it." Without an ack, the message is delivered again | Sent after the handler finishes |

`chatwave.events` is a **topic** exchange. Routing keys are words separated by dots, and bindings can use wildcards: `*` matches exactly one word, `#` matches any number of words. `q.activity` is bound with `#`, so it receives everything.

## Topology

Everything RabbitMQ needs is declared in **one function**, `setup_topology()` in [`api/app/core/events.py`](api/app/core/events.py):

| Queue | Bound to | Read by |
|---|---|---|
| `q.ingestion` | `document.uploaded` | ingestion worker |
| `q.cleanup` | `document.deleted`, `project.deleted` | cleanup worker |
| `q.activity` | `#` | activity worker |
| `q.dead` | everything sent to `chatwave.dead` | nobody (you, in the dashboard) |

- Every queue is **durable** (it survives a RabbitMQ restart), and every message is **persistent** (written to disk).
- `q.ingestion`, `q.cleanup` and `q.activity` have `x-dead-letter-exchange: chatwave.dead`. A message a worker rejects goes there instead of disappearing.
- **The API and every worker call `setup_topology()` at startup.** A message published to an exchange with no matching queue is **dropped silently**, so whichever process starts first creates everything. Declaring something that already exists is harmless, as long as its settings are identical. If they differ, RabbitMQ answers `PRECONDITION_FAILED`, and the queue must be deleted in the dashboard before it can be declared with the new settings.

## Events

| Event | Published by | Data | Copied into |
|---|---|---|---|
| `document.uploaded` | API, after an upload | `document_id`, `project_id` | `q.ingestion`, `q.activity` |
| `document.ready` | ingestion worker | `document_id`, `project_id` | `q.activity` |
| `document.failed` | ingestion worker | `document_id`, `project_id` | `q.activity` |
| `document.deleted` | API, after deleting a document | `document_id`, `project_id`, `storage_path` | `q.cleanup`, `q.activity` |
| `project.deleted` | API, after deleting a project | `project_id` | `q.cleanup`, `q.activity` |

Every message uses the same envelope, built by `make_message()`:

```json
{
  "event": "document.uploaded",
  "version": 1,
  "occurred_at": "2026-11-15T10:00:00+00:00",
  "data": { "document_id": "9b1c…", "project_id": "4e07…" }
}
```

What goes in `data`:
- **The id, when the data still exists.** The file is in S3 and the row in Postgres, so the worker reads the current state with the id. If the document was deleted meanwhile, the worker finds nothing and skips it.
- **The data itself, when it won't exist anymore.** `document.deleted` carries `storage_path` because the row is already gone when the cleanup worker runs.
- **`version`** lets the format change later without breaking consumers that still expect version 1.

## The flows

### Upload a document

1. The browser sends the file to `POST /api/projects/{id}/documents`. Or it sends a link to `POST /api/projects/{id}/documents/from-url`, and the API downloads the file itself (see [Adding a document from a link](#adding-a-document-from-a-link)).
2. The API checks the type, the size and the per-project limit, stores the file in S3 and saves the row with status `pending`.
3. The API publishes `document.uploaded` and answers right away.
4. The exchange copies the message into `q.ingestion` and `q.activity`.
5. The ingestion worker runs `process_document()`: it downloads the file, extracts the text, splits it into chunks, embeds them with OpenAI and saves them. The status goes `processing` → `ready`, or `failed` with the reason.
6. The worker acks the message and publishes `document.ready` or `document.failed`.
7. The activity worker logs `document.uploaded`, then `document.ready`. The browser polls the documents list every 4 seconds and shows the new status.

### Adding a document from a link

`app/services/url_fetch.py` downloads the file inside the request (it's capped, so it stays short), then the endpoint hands it to the same code as an upload. From there, nothing differs.

The server makes this request, not the user's browser, so a link could point at things only the server can reach: the EC2 metadata service at `169.254.169.254` (which hands out the server's AWS credentials), the database, RabbitMQ. This is called **SSRF**. To prevent it:

- Only `http` and `https` links are accepted.
- The name is resolved first, and **every** address behind it must be public (`ipaddress.is_global`). That excludes localhost, private networks, link-local addresses and IPv4 hidden in IPv6.
- Redirects are followed by hand, up to 3, and **each new address is checked again**: a public link can redirect to a private one.
- The body is read in pieces and stops past 10 MB, whatever size the site announces. There's a 15 s timeout.
- Web pages (`text/html`) are refused. Only PDF, Markdown and text files are accepted, like uploads.

Known gap: the address is checked, then resolved again when connecting. A hostile DNS server could answer differently the second time (*DNS rebinding*). Closing it means connecting to the exact IP that was checked.

### Delete a document

1. The API deletes the row. Its chunks go with it (`ON DELETE CASCADE`), so answers stop citing it immediately.
2. The API publishes `document.deleted` with the file's `storage_path`.
3. The cleanup worker deletes the file from S3.

### Delete a project

1. The API deletes the project. Its documents, chunks, conversations and messages go with it.
2. The API publishes **one** `project.deleted` event, not one per document.
3. The cleanup worker lists everything under `projects/{id}/` and deletes it in batches. Listing is why the IAM policy needs `s3:ListBucket` (see [DEPLOY.md](DEPLOY.md)).

### Ask a question (no RabbitMQ)

1. The API saves the question, embeds it with OpenAI, and finds the 5 closest chunks from the project's ready documents with pgvector.
2. Claude writes the answer from those passages. The API streams it to the browser as Server-Sent Events (`delta` pieces, then `done` with the saved message and its sources).

## What happens when something fails

| Situation | What happens | Why it's safe |
|---|---|---|
| A worker stops mid-job (Ctrl+C, deploy, crash) | No ack was sent, so RabbitMQ puts the message back in its queue when the connection closes, and the next worker redoes it | Handlers can run twice: processing replaces old chunks, and deleting a missing S3 file is not an error |
| A handler raises (bug, database down) | The worker rejects the message with `requeue=False`, and it goes through `chatwave.dead` to `q.dead` | It doesn't loop forever, and it isn't lost: you can read it in the dashboard |
| A file has no readable text | Not a crash: the document is marked `failed` with the reason, the worker acks and publishes `document.failed` | The user sees the error in the document's details |
| RabbitMQ is down when the API starts | The API refuses to start | The problem is visible at once, instead of uploads that never get processed |
| Publishing fails during an upload | The API marks the document `failed`: "Could not queue the document for processing" | The user isn't left with a document "Queued" forever |
| Publishing fails during a delete | The delete still succeeds for the user; the error is logged | Only the S3 file is left behind |

Three settings make this work, all in [`api/app/workers/base.py`](api/app/workers/base.py):

- **Ack after the work**, never before. A crash before the ack means the message is delivered again.
- **`prefetch_count=1`.** RabbitMQ sends a worker its next message only after the previous one is acked, so several workers share a queue fairly.
- **Reject without requeue** on an exception, so a message that always crashes ends up in `q.dead` instead of being retried in a loop.

## How a worker is built

`base.py` holds the RabbitMQ part, written once: connect, declare the topology, read the queue, decode the JSON, call a handler, ack or reject. A worker only provides **a queue name and a handler**:

```python
async def handle(event: str, data: dict, exchange: AbstractExchange) -> None:
    ...  # do the work; publish follow-up events with publish(exchange, ...) if needed


if __name__ == "__main__":
    run("q.cleanup", handle)
```

Workers are **not a separate app**. They use the same code as the API (models, services, settings), started with a different command, and in production they run from the same Docker image.

### Adding a consumer

1. Add its queue and bindings to `QUEUES` in `api/app/core/events.py`.
2. Create `api/app/workers/<name>.py` with a `handle` function and `run("q.<name>", handle)`.
3. Add a service to `docker-compose.yml`: `<<: *worker` with `command: python -m app.workers.<name>`.

No publisher changes. If the new consumer needs a new event, publish it with `publish(exchange, "thing.happened", {...})`.

## Running it locally

RabbitMQ with Homebrew (no Docker needed):

```bash
brew install rabbitmq
brew services start rabbitmq   # dashboard: http://localhost:15672 (guest / guest)
```

Then one terminal per process, from `api/` with the virtualenv active:

```bash
uvicorn app.main:app --reload            # the API
python -m app.workers.ingestion          # needed for uploads to become "Ready"
python -m app.workers.cleanup            # deletes S3 files after deletes
python -m app.workers.activity           # optional: logs every event
```

`RABBITMQ_URL` defaults to `amqp://guest:guest@localhost:5672/`, so nothing else is needed. A worker that isn't running doesn't break anything: its messages wait in its queue and are processed when it starts.

`api/playground/` has two small scripts (`publish.py`, `consume.py`) that use a separate `test` queue, for experimenting with RabbitMQ on its own.

## Looking inside RabbitMQ

The dashboard (`http://localhost:15672` locally; through an SSH tunnel in production, see [DEPLOY.md](DEPLOY.md)) shows:

- **Queues and Streams:** each queue's *Ready* count (waiting), *Unacked* count (being processed) and number of consumers. A *Ready* count that keeps growing means its worker isn't running.
- **Get messages**, on a queue's page: read waiting messages without consuming them. Use it on `q.dead` to see what crashed and why.
- **Publish message**, on the `chatwave.events` exchange's page: send an event by hand. To retry a message from `q.dead` after fixing the bug, publish its body again with the same routing key.
- **Connections:** one row for the API and one per worker.

## Known limits

- **Saved, then published.** The API commits the row and then publishes. If the process dies between the two, the document stays `pending`. The full fix is the *outbox pattern* (write the event in the same database transaction, publish it from there).
- **No delayed retries yet.** A crashed message goes straight to `q.dead`. Retrying a few times with a delay before giving up would need a retry queue with a TTL.
- **Activity only logs.** It doesn't store events anywhere yet.
- **Rate limits are in memory, per API process** (see the README), so they assume a single API container.
