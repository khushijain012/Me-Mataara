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

```bash
cd backend
cp .env.example .env            # adjust if needed
docker compose up -d            # starts Postgres on :5432 (or use your own)
npm install
npm run prisma:generate         # generate the Prisma client
npm run prisma:migrate          # create the schema (name it e.g. "init")
npm run db:seed                 # load demo data from the mock dataset
npm run dev                     # http://localhost:4000
```

`npm run db:reset` drops, re-migrates and re-seeds in one step.

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

## Not yet implemented (deliberately — see plan)

Web Push, virus scanning + blob storage for photos (currently accepted as data
URLs to match the frontend), live NZBN registry, and Circle SSO. These are the
next phases in `../docs/backend-plan.md`.
