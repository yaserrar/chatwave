# Deploying Chatwave to EC2

Chatwave shares the EC2 server (Traefik, Docker) with Dropwave. Every push to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

1. Type-checks the web app.
2. Builds the `api` and `web` images and pushes them to `ghcr.io/<owner>/chatwave-{api,web}`, tagged with the commit SHA and `latest`.
3. Copies [`docker-compose.yml`](docker-compose.yml) to the server, sets `IMAGE_TAG`, pulls, and restarts.

The API container applies pending Alembic migrations before it starts.

```
 chatwave.asrar.software ─▶ Cloudflare ─▶ Traefik :443 ─▶ /api/* ─▶ api (FastAPI :8000) ─▶ db (pgvector)
                            (proxied)                     ─▶ /*     ─▶ web (nginx :80)      "internal" network
```

- The browser only talks to one domain, so the guest session cookie stays same-origin (no CORS, no third-party cookie issues).
- Chatwave runs **its own Postgres** (`pgvector/pgvector:pg17`) because the shared infra Postgres has no pgvector. It sits on a private `internal` network, with its data in the `chatwave_db-data` volume. Dropwave's database is untouched.
- Files go to a private S3 bucket. The API reads and writes them with the instance's IAM role.

Everything below is one-time setup. The Traefik infra stack (`~/infra`: `proxy` network, `websecure`, `letsencryptresolver`, `secure-headers@docker`) is already running for Dropwave and is reused as is.

## 1. DNS (Cloudflare)

Add an **A** record `chatwave` (**Proxied**) pointing at the same Elastic IP as Dropwave. SSL/TLS mode stays **Full (strict)**. Keep it one level under `asrar.software`.

## 2. S3 bucket and IAM

1. Create a private bucket (e.g. `chatwave`) in `eu-west-3`, with Block Public Access on.
2. Add a statement for it to the EC2 instance role (the one Dropwave already uses):
   ```json
   {
     "Effect": "Allow",
     "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
     "Resource": "arn:aws:s3:::chatwave/*"
   }
   ```
3. The instance metadata hop limit of 2 is already set for Dropwave, so containers find the role's credentials.
4. Previews and downloads use presigned URLs opened from the browser. If the app fetches them cross-origin, add `https://chatwave.asrar.software` to the bucket's CORS `AllowedOrigins`.

## 3. App folder on the server

```sh
mkdir -p ~/chatwave && cd ~/chatwave
```

Create two files there, from [`.env.example`](.env.example) and [`.env.api.example`](.env.api.example):

- **`.env`**: `DOMAIN`, `IMAGE_OWNER`, `IMAGE_TAG`, `DB_PASSWORD`. Read by Docker Compose.
- **`.env.api`**: `SECRET_KEY`, `OPENAI_API_KEY`, `CLAUDE_API_KEY`, `AWS_REGION`, `S3_BUCKET`. Passed to the API container.

`docker-compose.yml` arrives with the first deploy.

Keep `DB_PASSWORD` and `SECRET_KEY` stable. The database keeps the first password it started with, and a new `SECRET_KEY` signs out every guest permanently (guests cannot log back in).

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
docker compose ps
docker compose logs -f api
docker compose exec api alembic current
docker compose exec db pg_dump -U chatwave chatwave > backup.sql   # backup
```

Logs of every container are also in Dozzle.

## Notes

- **Rate limits are per process and in memory** (see the README). One API container is assumed.
- **Client IP:** Traefik sits behind Cloudflare, so the per-IP guest limit sees Cloudflare's addresses unless Traefik is configured to trust Cloudflare's IP ranges (`forwardedHeaders.trustedIPs`) and forward `CF-Connecting-IP`. Until then the limit of new guests per IP is shared between users behind the same Cloudflare node, so raise `MAX_GUESTS_PER_IP_PER_HOUR` if you see false 429s.
- **Backups:** the database volume is not backed up by the infra stack. Schedule `pg_dump` (above) to S3 or a cron job if the data matters.
- **Uploads size:** the API accepts 10 MB per file. Traefik has no body limit by default.
