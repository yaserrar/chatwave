# Deploying Chatwave to EC2

Chatwave shares the EC2 server (Traefik, Docker) with Dropwave. Every push to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

1. Type-checks the web app.
2. Builds the `api` and `web` images and pushes them to `ghcr.io/<owner>/chatwave-{api,web}`, tagged with the commit SHA and `latest`.
3. Copies [`docker-compose.yml`](docker-compose.yml) to the server, sets `IMAGE_TAG`, pulls, and restarts.

The API container applies pending Alembic migrations before it starts.

```
 chatwave.asrar.software ─▶ Cloudflare ─▶ Traefik :443 ─┬─▶ /api/* ─▶ api (FastAPI :8000) ──┐
                            (proxied)                   └─▶ /*     ─▶ web (nginx :80)        │ publishes events
                                                                                             ▼
             "internal" network:   db (pgvector)   rabbitmq ─▶ worker-ingestion
                                                            ─▶ worker-cleanup
                                                            ─▶ worker-activity
```

- The browser only talks to one domain, so the guest session cookie stays same-origin (no CORS, no third-party cookie issues).
- Chatwave runs **its own Postgres** (`pgvector/pgvector:pg17`) because the shared infra Postgres has no pgvector. It sits on a private `internal` network, with its data in the `chatwave_db-data` volume. Dropwave's database is untouched.
- **RabbitMQ** (`rabbitmq:4-management-alpine`) runs on the same private network, with its queues and waiting messages in the `chatwave_rabbitmq-data` volume. It is not reachable from the internet. Its dashboard listens on the server's `127.0.0.1:15672` only (see [Day to day](#day-to-day)).
- The three **workers** run from the **same image as the API**, each with its own `command`. They receive no HTTP traffic, so they have no Traefik labels. [ARCHITECTURE.md](ARCHITECTURE.md) explains what each one does.
- Files go to a private S3 bucket. The API and the workers read and write them with the instance's IAM role.

Everything below is one-time setup. The Traefik infra stack (`~/infra`: `proxy` network, `websecure`, `letsencryptresolver`, `secure-headers@docker`) is already running for Dropwave and is reused as is.

## 1. DNS (Cloudflare)

Add an **A** record `chatwave` (**Proxied**) pointing at the same Elastic IP as Dropwave. SSL/TLS mode stays **Full (strict)**. Keep it one level under `asrar.software`.

## 2. S3 bucket and IAM

1. Create a private bucket (e.g. `chatwave`) in `eu-west-3`, with Block Public Access on.
2. Add two statements for it to the EC2 instance role (the one Dropwave already uses). Replace `chatwave` with the real bucket name:
   ```json
   {
     "Effect": "Allow",
     "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
     "Resource": "arn:aws:s3:::chatwave/*"
   },
   {
     "Effect": "Allow",
     "Action": "s3:ListBucket",
     "Resource": "arn:aws:s3:::chatwave"
   }
   ```
   The first one covers the **files** (`/*`). The second covers the **bucket itself**: deleting a project lists every file under `projects/{id}/` before deleting them, and listing is an action on the bucket, not on the files. Without it, the cleanup worker gets `AccessDenied` and the message lands in `q.dead`.
3. The instance metadata hop limit of 2 is already set for Dropwave, so containers find the role's credentials.
4. Previews and downloads use presigned URLs opened from the browser. If the app fetches them cross-origin, add `https://chatwave.asrar.software` to the bucket's CORS `AllowedOrigins`.

## 3. App folder on the server

```sh
mkdir -p ~/chatwave && cd ~/chatwave
```

Create two files there, from [`.env.example`](.env.example) and [`.env.api.example`](.env.api.example):

- **`.env`**: `DOMAIN`, `IMAGE_OWNER`, `IMAGE_TAG`, `DB_PASSWORD`, `RABBITMQ_PASSWORD`. Read by Docker Compose itself, to fill the `${...}` in `docker-compose.yml`.
- **`.env.api`**: `SECRET_KEY`, `OPENAI_API_KEY`, `CLAUDE_API_KEY`, `AWS_REGION`, `S3_BUCKET`. Passed to the API and the three workers.

Compose builds `DATABASE_URL` and `RABBITMQ_URL` from the two passwords in `.env`, so neither URL goes in `.env.api`. Generate both passwords as hex, so they need no URL-encoding: `openssl rand -hex 24`.

`docker-compose.yml` arrives with the first deploy.

Keep `DB_PASSWORD`, `RABBITMQ_PASSWORD` and `SECRET_KEY` stable. Postgres and RabbitMQ keep the password they first started with (changing it in `.env` alone breaks the connection), and a new `SECRET_KEY` signs out every guest permanently (guests cannot log back in).

## 4. GitHub

1. Make a deploy key and add its public half to `~/.ssh/authorized_keys` on the server:
   ```sh
   ssh-keygen -t ed25519 -f chatwave_deploy -N "" -C "github-actions-chatwave"
   ```
2. In **repo → Settings → Secrets and variables → Actions**, add `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY` (private key contents).
3. Create an environment named `production` (**Settings → Environments**).
4. Push to `main`, or run the workflow from the **Actions** tab.

The images are private on GHCR. Each deploy logs the server in with that run's short-lived token, pulls, and logs out.

## Day to day

```sh
cd ~/chatwave
docker compose ps                                    # 6 containers: db, rabbitmq, api, web, 3 workers
docker compose logs -f api
docker compose logs -f worker-ingestion              # watch uploads being processed
docker compose exec api alembic current
docker compose exec db pg_dump -U chatwave chatwave > backup.sql   # backup

# Queues at a glance: waiting messages and consumers per queue
docker compose exec rabbitmq rabbitmqctl list_queues name messages_ready messages_unacknowledged consumers

# Two ingestion workers for a burst of uploads (back to one: --scale worker-ingestion=1)
docker compose up -d --scale worker-ingestion=2
```

Logs of every container are also in Dozzle.

### RabbitMQ dashboard

It only listens on the server itself. Open an SSH tunnel from your machine:

```sh
ssh -L 15672:localhost:15672 <user>@<server>
```

then go to http://localhost:15672 and log in as `chatwave` with `RABBITMQ_PASSWORD`. Things to check:

- **`q.ingestion` Ready keeps growing:** `worker-ingestion` isn't running or keeps crashing. Look at its logs.
- **`q.dead` has messages:** a handler raised. *Get messages* on `q.dead` shows each message; the worker's logs show the error. After fixing it, publish the body again on the `chatwave.events` exchange with the same routing key.

## Notes

- **Workers and deploys:** a deploy restarts the workers. A message being processed at that moment was not acked, so RabbitMQ gives it back to the queue and the new worker processes it again. Messages waiting in queues survive restarts (durable queues, persistent messages, and the fixed `hostname: rabbitmq` that keeps RabbitMQ's data folder the same across re-creations).
- **Rate limits are per process and in memory** (see the README). One API container is assumed. Workers can be scaled; the API should not be.
- **Client IP:** Traefik sits behind Cloudflare, so the per-IP guest limit sees Cloudflare's addresses unless Traefik is configured to trust Cloudflare's IP ranges (`forwardedHeaders.trustedIPs`) and forward `CF-Connecting-IP`. Until then the limit of new guests per IP is shared between users behind the same Cloudflare node, so raise `MAX_GUESTS_PER_IP_PER_HOUR` if you see false 429s.
- **Backups:** the database volume is not backed up by the infra stack. Schedule `pg_dump` (above) to S3 or a cron job if the data matters.
- **Uploads size:** the API accepts 10 MB per file. Traefik has no body limit by default.
