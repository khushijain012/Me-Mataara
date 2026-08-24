# NQR — Not Quite Right

A frontline workplace-safety **Progressive Web App** and its domain API. If a worker spots something
that's *not quite right* on site, they raise it in a few taps, it goes straight to their supervisor,
the supervisor responds and closes the loop, and the exchange becomes a ready-made toolbox-talk
topic. **NQR** is part of the wider **Me Mataara** ecosystem and is funded by ACC.

This is a single npm **workspace root** — one `npm install`, one `npm run dev`, one lockfile.

## Layout

| Path | What it is |
| --- | --- |
| `frontend/` | React 18 + TypeScript + Vite 6 PWA (workspace `me-mataara`) — [README](frontend/README.md) |
| `backend/` | Node + Express + Prisma + PostgreSQL API (workspace `nqr-backend`) — [README](backend/README.md) |
| `docs/` | Backend plan, DB design, status reports |
| `Me-Mataara-Api/` | Superseded .NET API requirement docs, kept for reference |
| `../Native/` | React Native port — separate sibling folder, nothing scaffolded yet |

## Prerequisites

- Node ≥ 20
- PostgreSQL — `backend/docker-compose.yml` brings up a local one

## Getting started

Run everything from this folder. You never need to `cd` into `frontend/` or `backend/`.

```bash
npm install
```

```bash
cd backend; cp .env.example .env; docker compose up -d; cd ..
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
npm run dev
```

That last command boots both halves at once — API on **http://localhost:4000**, PWA on
**http://localhost:5173** — with `api`/`web` prefixed output.

## Scripts

All of these run from the repo root.

| Script | What it does |
| --- | --- |
| `npm run dev` | Both servers together (API 4000 + web 5173) |
| `npm run dev:api` | API only |
| `npm run dev:web` | PWA only |
| `npm run build` | Build backend, then frontend |
| `npm run typecheck` | `tsc --noEmit` across both workspaces |
| `npm run start` | Run the built API |
| `npm run preview` | Serve the built PWA |
| `npm run gen:icons` | Regenerate the PWA png icons |
| `npm run prisma:generate` | Generate the Prisma client |
| `npm run prisma:migrate` | Create/apply a dev migration |
| `npm run prisma:deploy` | Apply migrations (production) |
| `npm run db:seed` | Load demo data from the mock dataset |
| `npm run db:reset` | Drop, re-migrate and re-seed in one step |
| `npm run photos:backfill` | Move legacy base64 photos onto disk |
| `npm run photos:purge` | Reclaim disk from soft-deleted photos |

To run a one-off command inside a single workspace:

```bash
npm run <script> --workspace=backend
```

## Seeded sign-ins

All seeded accounts use the password **`password`**:

| Role | Mobile |
| --- | --- |
| Worker | `021 234 5678` |
| Supervisor | `021 000 0002` |
| Admin | `021 000 0001` |

## Wiring the PWA to the API

The frontend reads these from `frontend/.env`:

```
VITE_USE_MOCK=false
VITE_API_BASE=http://localhost:4000
VITE_CIRCLE_API_BASE=http://localhost:4000   # our auth stands in for Circle for now
```

With `VITE_USE_MOCK=true` the app runs entirely on in-memory/`localStorage` mock data and never
calls the API — useful for UI work without a database.

## Brand

Me Mataara guide: **Green Stone** `#4F878F`, **Gravel** `#BAB9B4`, **Slate** `#DAE2E2`,
**Charcoal** `#404040`, **Mustard** `#CAA545`; typeface **Quicksand**; the four-colour pinwheel
brandmark.
