# Deploying Libas-ul-Fakhar with Docker

The store runs as two containers from [`docker-compose.yml`](docker-compose.yml):

| Service | What it is | Data |
| --- | --- | --- |
| `db` | PostgreSQL 18 | volume `pgdata` |
| `app` | The Next.js store and back office (`apps/storefront/Dockerfile`) | volume `uploads` (product photos) |

The database port is published on `127.0.0.1` only, so it can't be reached from the internet. It is open on the server itself for the build step, backups and admin tools. On start the app applies any new database migrations automatically.

## Requirements

- Docker Engine with Compose v2 (or Docker Desktop on Windows/macOS)
- About 2 GB free disk for images and builds
- This repository on the server (`git clone https://github.com/alihamza1112/Libas-ul-fakhar.git`)

## 1. Settings

From the repository root:

```bash
cp .env.docker.example .env
```

Edit `.env` and set:

| Setting | Notes |
| --- | --- |
| `POSTGRES_PASSWORD` | Long and random, **letters and digits only** (it goes inside connection URLs) |
| `BUILD_DATABASE_URL` | Same password and `DB_PORT`: `postgres://libas:<password>@127.0.0.1:<DB_PORT>/libas` |
| `DB_PORT` | Port on the server for the database (default 5434) |
| `APP_PORT` | Port the store listens on (default 3000) |
| `NEXT_PUBLIC_SITE_URL` | The public address, e.g. `https://libasulfakhar.pk` |
| `NEXT_PUBLIC_WHATSAPP` | WhatsApp number in international format, no `+` |
| `ADMIN_PASSWORD` | Back office password for `/admin` |
| `AUTH_SECRET` | 32+ random characters; secures customer sign-in. Changing it signs everyone out |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional; enables Google sign-in |
| `SEED_SAMPLE_PRODUCTS` | `false` (default): a new store starts with no products. `true`: fill a new database with 41 demo products, for a demo site |

`.env` holds secrets and is git-ignored. Never commit it.

## 2. First start

```bash
docker compose up -d db        # start the database
docker compose build app       # build the store
docker compose up -d           # start everything
```

The database has to be running before `build`, because the build prerenders catalogue pages from it. The build connects through `127.0.0.1:<DB_PORT>`. The connection string reaches the build as a secret and is not stored in the image.

On an empty database the first start creates the tables. The store then has no products until you add them in `/admin/products` (or set `SEED_SAMPLE_PRODUCTS=true` for demo products). Home page sections such as New arrivals and Best sellers appear once there are products to show. Check it is up:

```bash
docker compose ps              # app should be "healthy"
docker compose logs -f app
```

Then open `http://<server>:<APP_PORT>`.

## 3. Moving existing data in (optional)

**From another PostgreSQL** (e.g. the local development database):

```bash
pg_dump --data-only --no-owner --exclude-table=schema_migrations "postgres://libas:<old-password>@localhost:5432/libas" > data.sql
docker compose exec -T db psql -U libas -d libas -c "TRUNCATE products, variants, customers, addresses, sessions, otps, orders, order_items, order_history, subscribers, stock_alerts, audit_log RESTART IDENTITY CASCADE"
docker compose exec -T db psql -U libas -d libas -v ON_ERROR_STOP=1 < data.sql
```

Run the migrations on the old database first (`npm run db:migrate` in `apps/storefront`) so both have the same columns.

**Product photos** live on disk, not in the database. Copy them into the `uploads` volume:

```bash
docker compose cp apps/storefront/data/uploads/products/. app:/app/data/uploads/products/
docker compose exec -u root app chown -R nextjs:nodejs /app/data/uploads
```

In Git Bash on Windows, put `MSYS_NO_PATHCONV=1` in front of both commands. Otherwise Git Bash rewrites the `/app/...` paths.

Restart the app afterwards (`docker compose restart app`) so the store reads the new data straight away.

## 4. Updating to a new version

```bash
git pull
docker compose build app
docker compose up -d
```

New migrations in `apps/storefront/db/migrations/` apply on start. Your data, photos and settings stay in their volumes and `.env`.

Settings that start with `NEXT_PUBLIC_` are built into the site, so after changing them run `docker compose build app` again. Other settings only need `docker compose up -d`.

## 5. Backups

Database:

```bash
docker compose exec -T db pg_dump -U libas -d libas --clean --if-exists > backup-$(date +%F).sql
```

Restore:

```bash
docker compose exec -T db psql -U libas -d libas -v ON_ERROR_STOP=1 < backup-2026-10-29.sql
```

Photos:

```bash
docker run --rm -v libas-ul-fakhar_uploads:/data -v "$PWD":/backup alpine tar czf /backup/uploads-$(date +%F).tgz -C /data .
```

Keep backups off the server, and schedule both (for example a daily cron job).

## 6. HTTPS and the domain

The app serves plain HTTP on `APP_PORT`. On a real server, put a reverse proxy in front of it for HTTPS. Caddy is the simplest (`libasulfakhar.pk { reverse_proxy 127.0.0.1:3000 }`); nginx works too. Then:

- set `NEXT_PUBLIC_SITE_URL` to the `https://` address and rebuild,
- block direct access to `APP_PORT` in the firewall (or set `APP_PORT=127.0.0.1:3000`),
- for Google sign-in, register `<NEXT_PUBLIC_SITE_URL>/api/auth/google/callback` as the redirect URI.

## Useful commands

| Command | Purpose |
| --- | --- |
| `docker compose logs -f app` | Live app log (sign-in codes appear here until an SMS provider is connected) |
| `docker compose restart app` | Restart the store |
| `docker compose exec db psql -U libas -d libas` | SQL shell |
| `docker compose down` | Stop everything (data is kept) |
| `docker compose down -v` | Stop and **delete all data and photos** |
