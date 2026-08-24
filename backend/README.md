# NQR backend

The NQR domain backend — concerns, hazards, prompts, offline sync, notifications,
analytics — built with **Node + Express + Prisma + PostgreSQL**.

Auth is our own **JWT** (mobile + password) for now, kept behind the same identity
contract the PWA already expects, so it can be swapped to Circle SSO later without
touching feature code. See [`../docs/backend-plan.md`](../docs/backend-plan.md) for
the full plan.

## Prerequisites

- Node ≥ 20
- PostgreSQL (a `docker-compose.yml` is included for a local one)

## Getting started

Install and run from the **repo root** — this package is an npm workspace, so it has no
`node_modules` or lockfile of its own. Only the Postgres and `.env` steps happen in this folder:

```bash
cd backend; cp .env.example .env; docker compose up -d; cd ..
```

Then, from the root:

```bash
npm install
```

```bash
npm run prisma:generate
```

```bash
npm run prisma:migrate
```

```bash
npm run db:seed
```

```bash
npm run dev:api
```

That serves http://localhost:4000. `npm run dev` at the root starts this API *and* the PWA together,
and `npm run db:reset` drops, re-migrates and re-seeds in one step. Every script below is available
from the root — see the [root README](../README.md) for the full list.

## Seeded sign-ins

All seeded accounts use the password **`password`**:

| Role       | Mobile         |
|------------|----------------|
| Worker     | `021 234 5678` |
| Supervisor | `021 000 0002` |
| Admin      | `021 000 0001` |

## Wiring the PWA to this backend

The frontend already has the seams. Point it at this API and turn off the mock:

```
# frontend .env
VITE_USE_MOCK=false
VITE_API_BASE=http://localhost:4000
VITE_CIRCLE_API_BASE=http://localhost:4000   # our auth stands in for Circle for now
```

> Note: an `apiProvider` that calls `/auth/*` isn't wired into `src/lib/identity`
> yet — that's the paired frontend task. This backend implements the endpoints it
> will consume. See the plan's §14.

## API surface

Base URL = `PORT` (default `http://localhost:4000`). Every route is also available
under `/v1`. All routes require `Authorization: Bearer <token>` except `/health`,
`/auth/register`, `/auth/login`, and `/nzbn/*` (used pre-auth during registration).

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/health` | – | Liveness |
| POST | `/auth/register` | – | Self-register (worker) → `{ token, identity }` |
| POST | `/auth/login` | – | Mobile + password → `{ token, identity }` |
| GET | `/auth/me` | any | Restore identity from token |
| POST | `/auth/logout` | any | No-op (stateless JWT) |
| GET | `/supervisors` | any | Supervisor list ("claim your supervisor") |
| GET | `/supervisors/:id/crew` | any | Crew + unclaimed workers |
| GET | `/hazards` | any | Risk catalogue (workers: active only) |
| PUT | `/hazards` | admin | Save catalogue |
| GET | `/prompts` | any | Preset supervisor responses |
| PUT | `/prompts` | admin | Save prompts |
| GET | `/ako-korero` | any | Cultural content |
| POST | `/concerns` | any | Raise a concern (idempotent on `clientId`) |
| GET | `/concerns` | scoped | List (filters: `status`, `since`, `ref`) |
| GET | `/concerns/:key` | scoped | Detail by ref (HZ-####) or id |
| GET | `/concerns/photos/:id` | signed link | Stream a stored concern photo |
| PATCH | `/concerns/:id/status` | supervisor/admin | Set open / in_progress |
| POST | `/concerns/:id/close` | supervisor/admin | Close + risk reduction |
| POST | `/concerns/:id/actions` | supervisor/admin | Add a response |
| POST | `/sync` | any | Flush offline queue → `{ synced, event }` |
| GET | `/notifications` | any | Caller's notifications |
| POST | `/notifications/read-all` | any | Mark all read |
| GET | `/analytics/summary` | admin | Headline tiles |
| GET | `/analytics/businesses` | admin | Businesses by NZBN |
| GET | `/analytics/businesses/:nzbn/users` | admin | Drill-down (no demographics) |
| GET | `/analytics/demographics` | admin | Aggregate only (k-anonymised) |
| GET | `/analytics/categories` | admin | Risk themes |
| GET | `/analytics/trend` | admin | Weekly reported vs closed |
| DELETE | `/analytics/companies/:nzbn` | admin | Bulk-delete a business |
| GET | `/members` | admin | List workers + supervisors |
| DELETE | `/members/:id` | admin | Remove a member + their concerns |
| GET | `/media` | any | Content library (filter `?type=doc\|video\|audio`) |
| POST | `/media` | admin | Upload a file ≤ 100 MB (mp3/mp4/pdf) → `storage/<type>/` |
| GET | `/media/:id/file` | any | Stream a stored file |
| DELETE | `/media/:id` | admin | Soft-delete a media asset |
| GET | `/quick-links` | any | Quick links (filter `?type=docs\|videos`) |
| POST | `/quick-links` | admin | Create a quick link |
| DELETE | `/quick-links/:id` | admin | Soft-delete a quick link |
| GET | `/nzbn/search?q=` | – | Company-name lookup |
| GET | `/nzbn/:nzbn` | – | NZBN → name |
| GET | `/system/sync-events` | scoped | Sync history |
| GET | `/system/errors` | admin | Error log |

## Photo & file storage

Uploaded bytes live on disk, never in Postgres. Everything lands under
`STORAGE_ROOT` (`backend/storage/`, git-ignored) and the database keeps only a
relative `storage_key`:

| What | Where | Table |
|---|---|---|
| Concern photos (#8) | `storage/photos/<YYYY>/<MM>/<uuid>.jpg` | `concern_photo.storage_key` |
| Docs / video / audio (#4, #5) | `storage/<type>/<ts>-<name>` | `media_asset.storage_key` |

Concern photos are still **uploaded** as base64 data URLs inside the `POST
/concerns` and `POST /sync` payloads — that is the shape that survives in the
PWA's offline queue — but `src/lib/photos.ts` decodes them, validates the format
(jpeg/png/webp, ≤ 8 MB each) and writes the file before the row is inserted. If
the insert fails, the files it would have referenced are unlinked again.

Reads go the other way: `toConcern()` returns `photos` as URLs, not base64, so
concern payloads stay small no matter how many photos a site has accumulated.
Because `<img src>` cannot send an `Authorization` header, each URL carries a
short-lived HMAC signature (`?t=<expiry>.<sig>`, `PHOTO_URL_TTL_SECONDS`) minted
only for viewers already allowed to see that concern; a Bearer token also works
for API clients. Photos of a soft-deleted concern stop serving.

The frontend renders both shapes through `resolveFileUrl()` in
`src/lib/api/client.ts`: API-relative URLs are prefixed with `VITE_API_BASE`, and
the data URLs still held by offline records pass through untouched.

### Reclaiming disk (`photos:purge`)

Deletes here are **soft** (see `src/prisma.ts`: `delete` becomes
`is_deleted = true`). So removing a member or a business must *not* unlink their
photo files — the rows survive and have to keep pointing at real bytes, or the
records become unrestorable. Freeing that space is therefore a separate,
deliberate step:

```bash
npm run photos:purge -- 30 --dry-run   # what a 30-day retention would remove
npm run photos:purge                   # default 90-day retention
```

It unlinks the file first and hard-deletes the row second, so an interrupted run
never leaves a live row pointing at a missing file.

### Migrating an existing database

Photos used to be stored as base64 in `concern_photo.data_url`. The move is an
expand → backfill → contract sequence, so no bytes are dropped before they are
safely on disk:

```bash
npm run prisma:migrate       # adds storage_key/mime_type/size_bytes, data_url → nullable
npm run photos:backfill      # writes each base64 row to disk and clears the column
```

The backfill is re-runnable and reports how many rows are left. Once it reports
**0 still in the database**, drop the dead column — remove the `dataUrl` field
from `ConcernPhoto` in `prisma/schema.prisma` and run `npm run prisma:migrate`
again. A fresh database (`npm run db:reset`) needs no backfill; the seed creates
no photos.

## Not yet implemented (deliberately — see plan)

Web Push, virus scanning and off-box object storage for uploads (files are on the
app server's local disk for now, which is a single machine's worth of capacity and
not shared between instances), live NZBN registry, and Circle SSO. Hazard
catalogue images are also still base64 in `hazard_category.data_url` — a small
fixed catalogue rather than per-report growth, so it was left alone here. These
are the next phases in `../docs/backend-plan.md`.
