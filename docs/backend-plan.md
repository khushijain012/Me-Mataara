# Me Mataara / NQR — Backend Requirements & Delivery Plan

> **Status:** planning only — nothing in this document is implemented yet.
> **Audience:** the engineer building the NQR domain backend, plus whoever coordinates with the Circle team.
> **Source of truth for scope:** the client clarifications doc (referenced throughout as "doc §n"), the existing frontend (`src/`), and `README.md`.

---

## 1. Context & current state

**NQR ("Not Quite Right")** is a frontline workplace-safety PWA in the wider **Me Mataara** ecosystem, funded by **ACC**. A worker spots something not-quite-right on site, raises it in a few taps, it routes to their supervisor, the supervisor responds and closes the loop, and the exchange becomes a toolbox-talk topic.

Today the app is a **frontend-only prototype**. All data is in-memory / `localStorage`. There is no backend. The codebase has, however, already been built with the **seams for a backend in place**:

| Seam | File | What it does today | What it becomes |
|---|---|---|---|
| Domain API client | `src/lib/api/client.ts` | Inert; throws unless `VITE_API_BASE` set | Thin fetch client → **NQR domain backend** (this plan) |
| Identity provider | `src/lib/identity/` | `mockProvider` (device-local) is active | `circleProvider` → **Circle** (IdP + hierarchy) |
| In-memory store | `src/context/AppContext.tsx` | Holds all app state, persists to `localStorage` | Replaced by API-backed hooks |
| Seed / mock data | `src/lib/mockData.ts` | Hazards, prompts, concerns, orgs, NZBN registry | Becomes DB **seed data** + live integrations |
| Feature flag | `VITE_USE_MOCK` (`.env`) | `true` → mock everything | `false` → live Circle + live domain API |

**Key architectural decision already baked in (client decision, Aug 2026):** Circle is the **system of record for all accounts and the reporting hierarchy**. The PWA is a *read-only consumer* of identity. Our backend does **not** own accounts — it owns the **safety domain** (concerns, hazards, responses, analytics, sync).

So there are **two backends**, and this plan is explicit about which is which:

1. **Circle** (built/owned by the Circle team) — authentication (SSO/OAuth), accounts, the four-tier hierarchy, Worker→Supervisor edges. **We consume it; we do not build it.** We *do* need to hand Circle a contract and confirm open questions.
2. **NQR domain backend** (built/owned by us — a **.NET API**, per `.env`) — everything about safety concerns and reporting. **This is the bulk of the work below.**

---

## 2. Target architecture

```
                 ┌─────────────────────────────┐
                 │        NQR PWA (React)        │
                 │  installable, offline-first   │
                 └───────┬───────────────┬───────┘
        Bearer (Circle    │               │  Bearer (Circle token)
         SSO token)       │               │
                          ▼               ▼
        ┌──────────────────────┐   ┌──────────────────────────────┐
        │   CIRCLE (external)   │   │   NQR DOMAIN BACKEND (.NET)   │
        │  • OAuth/SSO auth     │   │  • verifies Circle JWT        │
        │  • accounts / members │   │  • concerns + responses loop  │
        │  • 4-tier hierarchy   │   │  • hazard & prompt catalogue  │
        │  • Worker→Supervisor  │◄──┤  • offline sync ingest        │
        │    edges              │   │  • analytics / exports        │
        └──────────────────────┘   │  • notifications / web push   │
                                    │  • media (photos)             │
                                    └───────────────┬──────────────┘
                                                    ▼
                          ┌──────────────┬────────────────┬─────────────┐
                          │  Database     │  Blob storage   │  NZBN API    │
                          │ (Postgres/    │  (photos,       │  (govt       │
                          │  SQL Server)  │   hazard imgs)  │  registry)   │
                          └──────────────┴────────────────┴─────────────┘
```

**Auth model:** the PWA authenticates the user against **Circle** and stores the returned token (`localStorage['nqr.circle.token']`). Every call to our backend carries that token as `Authorization: Bearer …`. Our backend **verifies the token against Circle** (JWKS / introspection) and trusts the claims for identity + role. Our backend never issues its own passwords/logins (the mock's password path is prototype-only).

---

## 3. Scope boundary (build to this, not beyond)

### In scope for V1 (the loop)
- Self-registration capture *(mock only today; under Circle, provisioning moves upstream — see §5)*.
- Report a concern: pick risk(s) from a fixed catalogue (each with its image), optional note, "when noticed", optional **photo**, optional **anonymous**.
- Route the concern to the worker's linked supervisor (one supervisor per concern).
- Concern lifecycle: **Open / In Progress / Closed**, visible to the worker with the supervisor's actual response.
- Supervisor: inbox, respond with **preset prompts** or a custom message, close with an **outcome + risk reduction**, and a **Toolbox** rolling **four-week** window with **cycle-time** (time-to-close).
- Platform admin: user management, **Analytics** (NZBN businesses, user counts, drill-down to users, **aggregate-only** demographics), risk/image management, prompt management, close-concern rights, bulk company deletion.
- Offline: a report raised with no signal is held on-device and **syncs automatically** on reconnect.

### Out of scope for V1 (V2 / deferred — do not build)
- Daily safety questionnaire.
- A "Leader" role.
- Escalation; editing / reassigning / reopening concerns.
- Theme-level aggregate reporting.

---

## 4. Data model (domain backend owns these)

Derived from `src/lib/types.ts`. Identity fields marked *(Circle)* are **mirrored/read** from Circle, not owned by us.

### 4.1 Entities

**MemberProfile** — our local mirror/projection of a Circle member + domain-only profile fields.
- `memberId` *(Circle, PK)* · `circleRole` (`platform_owner|company_owner|supervisor|worker`) · derived app `role`
- `firstName`, `lastName`, `email`, `mobile` *(Circle)*
- `companyId`, `companyName`, `nzbn`, `organisation` *(Circle / registration)*
- `supervisorId`, `supervisorName` *(Circle edge — read-only)*
- Domain profile: `dob`, `gender`, `industry`, `isHSR`, `workerNumber`, `verificationStatus`
- Derived (never expose per-user): `age`, `ageBand`
- **Decision needed:** do we persist a mirror at all, or read live from Circle each request? (See §11.) Recommendation: cache a thin mirror keyed by `memberId`, refreshed on login, for analytics joins + performance.

**Company / Organisation** — the NZBN businesses.
- `nzbn` (PK) · `name` · `sites` · `workerCount` · `adoption%` (derived) · `createdAt`
- Analytics aggregates roll up to this.

**HazardCategory** (risk catalogue) — admin-editable.
- `id` · `label` · `maoriLabel` · `icon` (lucide name) · `image` (URL → blob storage) · `description` · `tint` · `active` · `sortOrder`
- **Note:** in the prototype images are embedded data-URLs in code. In the backend these become managed assets in blob storage with a stable URL.

**SupervisorPrompt** — admin-editable preset responses.
- `id` · `label` · `active` · `sortOrder`

**Concern** — the core aggregate.
- `id` (server) · `ref` (human, e.g. `HZ-1043` — server-generated, monotonic per tenant) · `clientId` / **idempotency key** (for offline dedupe — see §7)
- `categoryId` (primary) · `riskIds[]` · `description` · `status` · `sceneDate`
- `reportedById` *(memberId)* · `reportedBy` (display) · `reportedAnonymous`
- `supervisorId` (routing target) · `assignedTo` (display)
- `reportedAt` · `closedAt` / `closedAtIso` · `timeToCloseHours` (derived server-side) · `riskReduction`
- `companyId` / `nzbn` (denormalised for tenant scoping + analytics)
- media: `photoIds[]` → **Media** entity
- sync/telemetry (server-authoritative): `capturedAt`, `syncedAt`, `captureStatus`
- `actions[]` → **CorrectiveAction**

**CorrectiveAction** (a response on a concern).
- `id` · `concernId` · `authorId` · `authorName` · `role` · `message` · `at` · `promptId?` · `responseType` (`preset|custom`)

**Media** — uploaded photos.
- `id` · `concernId?` · `ownerId` · `contentType` · `sizeBytes` · `blobUrl` · `createdAt` · virus-scan status

**Notification**.
- `id` · `recipientId` · `kind` (`new_concern|status|reminder|closed`) · `title` · `body` · `concernRef?` · `at` · `read`

**AkoKorero** (cultural learning content) — `id` · `title` · `body` · `active`. Likely admin-managed or static-seeded.

**SyncEvent** *(telemetry)* — `id` · `memberId` · `at` · `result` (`success|failure`) · `count` · `message`.

**ErrorLog / AuditLog** — `id` · `at` · `actorId` · `code` · `message` · `entity` · `entityId` · `retries` · `resolved`. Audit log must record every state transition on a concern and every admin action (privacy/ACC compliance).

### 4.2 Key relationships & rules
- A **Concern** belongs to exactly one **reporter** (worker) and is routed to exactly one **supervisor** (the Worker→Supervisor edge at report time — snapshot it; don't re-derive if the edge later changes).
- **Anonymity:** when `reportedAnonymous = true`, the reporter's identity must be **withheld from all supervisor/admin-facing responses** but retained server-side (encrypted / access-controlled) for audit and duplicate-prevention only. This is a hard server-side rule — never rely on the client to hide it. **Decision needed:** can a platform admin ever de-anonymise? (Recommend: no, except a sealed audit path.)
- **Tenant scoping:** every domain read/write is scoped to the caller's company/role. A worker sees only their own concerns; a supervisor sees concerns routed to them; a company owner sees their company; platform owner sees all (aggregates only for demographics).
- **Cycle-time** (`timeToCloseHours`) is computed **server-side** at close (`closedAtIso - reportedAt`), never trusted from the client.
- **Refs** (`HZ-####`) are generated server-side to avoid collisions across devices/offline queues.

---

## 5. Circle integration (consume + coordinate)

We do **not** build Circle. We must (a) implement the client-side `circleProvider` against Circle's real endpoints, and (b) make our backend verify Circle tokens. The **proposed contract** already lives in `src/lib/identity/circleProvider.ts`:

```
GET  {CIRCLE}/me                    → CircleMemberDto            (Bearer)
GET  {CIRCLE}/supervisors           → CircleSupervisorDto[]
GET  {CIRCLE}/supervisors/:id/crew  → { crew:[], unclaimed:[] }
SSO  GET {CIRCLE}/authorize?redirect_uri=…  → returns to app with #token=…
POST {CIRCLE}/logout
```

`CircleMemberDto` fields our app relies on: `id, firstName, lastName, email, mobile, role, companyId, companyName, supervisorId, supervisorName, dob?, industry?, isHSR?, workerNumber?, nzbn?, organisation?`.

### What we must get from / agree with Circle
1. **Auth mechanism** — OAuth2/OIDC? Token format (JWT)? **JWKS endpoint** or token-introspection endpoint so our .NET backend can validate. Token lifetime + refresh.
2. **Open decision (blocking):** email OTP vs SMS OTP for sign-in — *currently undecided* per README. Affects the login UX and whether we need any OTP handling.
3. **Role/tier mapping** — Circle's four tiers → our three UI roles (`toAppRole`: company_owner & platform_owner → admin). Confirm this mapping is acceptable, or whether a Company-Owner surface is needed (currently treated as admin).
4. **Hierarchy read** — `supervisors` and `crew` endpoints, including the `unclaimed` list and the `approval` state (`approved | awaiting_approval`).
5. **Which profile fields Circle stores** vs. which we capture (dob/gender/industry/isHSR/nzbn). If Circle owns them, we read; if not, our backend captures them at first login.
6. **Provisioning** — under Circle, in-app registration is disabled (`managesAccounts=false`); accounts are created in Circle. Confirm the onboarding journey (invite flow, how a worker "claims" a supervisor).
7. **Data residency / privacy** boundary between Circle and us (see §8).

**Deliverable to Circle:** a one-page API contract (the block above, expanded with DTOs, auth, and error shapes) for their team to build and confirm.

---

## 6. NQR domain backend — functional requirements by module

Each requirement notes the frontend call site it satisfies so nothing is built that the app can't use, and nothing the app needs is missed.

### 6.1 Auth & authorization (cross-cutting)
- Verify incoming `Authorization: Bearer <circle-token>` on every domain endpoint (JWT signature via Circle JWKS, `exp`, `aud`, `iss`).
- Resolve `memberId`, `circleRole`, `companyId` from claims; map to app role.
- Enforce role-based authorization: worker / supervisor / company_owner / platform_owner.
- Enforce tenant scoping on every query.
- Reject/replay protection; clock-skew tolerance.
- *(No password auth — the mock's `authenticatePassword` + `hashPassword` are prototype-only and must NOT be ported.)*

### 6.2 Profiles (`getMe`, registration projection)
- `GET /me/profile` — return the domain profile projection for the authenticated member (joins Circle identity + domain-only fields). Satisfies `AppContext.identityToProfile`.
- On first authenticated call, create the local mirror row if absent (upsert from Circle claims/`/me`).
- Capture domain-only fields (industry, isHSR, workerNumber, gender) if Circle doesn't own them.

### 6.3 Hazard catalogue (`hazards`, `saveHazards`)
- `GET /hazards` — active + inactive (admin) / active-only (worker). Feeds `HazardReport` risk grid and admin editor.
- `PUT /hazards` (admin) — save order/active/label/description; upload/replace image → blob storage.
- Seed from `HAZARD_CATEGORIES` in `mockData.ts` (labels, māori labels, icons, descriptions, tints). Migrate embedded images to blob storage.

### 6.4 Supervisor prompts (`prompts`, `savePrompts`)
- `GET /prompts` · `PUT /prompts` (admin). Seed from `SUPERVISOR_PROMPTS`.

### 6.5 Concerns — the core loop
Satisfies `addConcern`, `updateConcernStatus`, `closeConcern`, `addAction`, and all worker/supervisor concern views.
- `POST /concerns` — create. Body: `categoryId, riskIds[], description, sceneDate, reportedAnonymous, photoIds[], clientId/idempotencyKey, capturedAt`. Server sets `ref`, `status=open`, routing (`supervisorId` from the caller's edge), `reportedById`. Returns the full concern.
- `GET /concerns` — list, filtered/scoped by role (worker: own; supervisor: routed-to-me; admin: company/all). Support `?status=`, `?since=` (four-week toolbox window), `?ref=`.
- `GET /concerns/{id}` — detail incl. actions + media URLs. Enforce anonymity projection.
- `PATCH /concerns/{id}/status` — transition to `in_progress` (open→in_progress). Closing goes through the close endpoint.
- `POST /concerns/{id}/close` — body `{ riskReduction }`. Server sets `status=closed`, `closedAtIso`, computes `timeToCloseHours`. **Authorization:** supervisor on the concern, or admin (close-concern right).
- `POST /concerns/{id}/actions` — add a response `{ message, promptId? }`; server sets `responseType` (`preset` if `promptId` else `custom`), `authorId/Name/role`, and transitions open→in_progress. Emits a notification to the worker.
- Emit notifications on create (→ supervisor), on response (→ worker), on close (→ worker).

### 6.6 Media / photos
- `POST /media` — multipart upload; validate content-type + size; store to blob; **virus/malware scan**; strip EXIF/GPS unless required; return `mediaId` + URL. Referenced by concern create.
- `GET /media/{id}` — authorized, tenant-scoped, time-limited signed URL.
- **Note:** the current `HazardReport.tsx` UI captures risks/note/date/anonymous but does **not yet wire a photo picker**, though README §3 and the data model include photos. **Decision needed:** is photo capture in V1? If yes, the frontend also needs a small addition. Plan the endpoint regardless.

### 6.7 Offline sync
Satisfies `syncOfflineConcerns`, `pendingSync`, `SyncEvent`.
- Client queues concern creates (and actions) offline; on reconnect it flushes them.
- **Idempotent ingest:** `POST /concerns` (and actions) must accept a **client idempotency key** so replays after a flaky reconnect don't create duplicates. Return the canonical server record either way.
- `POST /sync` (optional batch) — accept an array of queued mutations, apply in order, return per-item result → drives the `SyncEvent` (`success|failure`, `count`, message).
- Server timestamps: preserve `capturedAt` (device) distinct from `syncedAt` (server receipt).
- The PWA also needs **real** offline persistence (IndexedDB) + Background Sync on the client — noted here as a paired client task (README "Next phase").

### 6.8 Notifications & push
Satisfies `notifications`, `markAllRead`, `unreadCount`, and upgrades the current local `Notification` API to real delivery.
- `GET /notifications` · `POST /notifications/read-all`.
- Generated server-side by concern lifecycle events (§6.5).
- **Web Push** (PWA): VAPID keys, `POST /push/subscribe` to store `PushSubscription`, server sends push on new_concern/response/closed. Requires service-worker `push` handler on the client (paired task).

### 6.9 Analytics & reporting (admin)
Satisfies `AdminAnalytics.tsx`.
- `GET /analytics/summary` — headline tiles: NZBN business count, registered users, concerns raised, **avg time-to-close**.
- `GET /analytics/businesses` — businesses by NZBN with `users, sites, adoption%`; drill-down `GET /analytics/businesses/{nzbn}/users` (name, role, crew — **no per-user demographics**).
- `GET /analytics/demographics` — **aggregate only**: gender split (%), average age band. Enforce a minimum cohort size (k-anonymity) so small groups can't be re-identified.
- `GET /analytics/categories` — risk-theme breakdown (counts per hazard category) — feeds the bar chart / `CATEGORY_BREAKDOWN`.
- `GET /analytics/trend` — weekly trend (`WEEKLY_TREND`).
- **Exports:** CSV (minimum), Excel, PDF. The prototype does these client-side; for large/authoritative exports provide `GET /analytics/export?format=csv|xlsx|pdf`. Keep client-side CSV as a fallback.
- `DELETE /companies/{nzbn}` (platform owner) — bulk-delete a business and all its users' domain data (cascade + audit; irreversible → confirm + soft-delete window recommended).

### 6.10 Admin — users
Satisfies `AdminUsers.tsx`.
- **Note:** accounts live in Circle. So "user management" here is either (a) a **read-through** to Circle's member APIs, or (b) invitations/approvals handled in Circle. `AdminUsers` currently shows invite / status (active/invited/inactive/**awaiting approval**) / bulk-delete against mock rows.
- **Decision needed:** which user-management actions are ours vs Circle's? Recommend: listing + status are **read** from Circle; invite/approve/delete are **delegated** to Circle (deep-link or proxied). Our backend only owns domain data attached to a member.

### 6.11 Ako Kōrero (cultural content)
- `GET /ako-korero` — seeded from `AKO_KORERO`. Static seed acceptable for V1; admin CRUD optional.

### 6.12 System status / telemetry
Satisfies `SystemStatus.tsx`, `syncEvents`, `errorLogs`.
- `GET /system/sync-events` · `GET /system/errors` (scoped) for the diagnostics view.
- `GET /health` (liveness/readiness) for ops.

### 6.13 NZBN registry lookup
Satisfies `searchNzbnByName`, `lookupNzbn` in registration.
- Integrate the **live NZBN API** (`nzbn.govt.nz`) — search by company name → NZBN, and NZBN → name.
- **Decision needed:** does the PWA call NZBN directly, or proxy through our backend? Recommend **proxy** (`GET /nzbn/search?q=`, `GET /nzbn/{nzbn}`) to hold the API credential server-side, cache results, and rate-limit. Requires an NZBN API key.

---

## 7. API surface (catalogue)

Base URL = `VITE_API_BASE`. All require `Authorization: Bearer <circle-token>` unless noted. JSON. Versioned under `/v1`.

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/v1/me/profile` | any | Domain profile projection |
| GET | `/v1/hazards` | any | Risk catalogue (worker: active only) |
| PUT | `/v1/hazards` | admin | Save catalogue |
| GET | `/v1/prompts` | any | Preset prompts |
| PUT | `/v1/prompts` | admin | Save prompts |
| GET | `/v1/ako-korero` | any | Cultural content |
| POST | `/v1/media` | worker+ | Upload photo |
| GET | `/v1/media/{id}` | scoped | Signed media URL |
| POST | `/v1/concerns` | worker+ | Create concern (idempotent) |
| GET | `/v1/concerns` | scoped | List (filters: status, since, ref) |
| GET | `/v1/concerns/{id}` | scoped | Detail (+ actions, anonymity applied) |
| PATCH | `/v1/concerns/{id}/status` | supervisor/admin | → in_progress |
| POST | `/v1/concerns/{id}/close` | supervisor/admin | Close + riskReduction |
| POST | `/v1/concerns/{id}/actions` | supervisor/admin | Add response |
| POST | `/v1/sync` | worker+ | Batch flush offline queue |
| GET | `/v1/notifications` | any | List |
| POST | `/v1/notifications/read-all` | any | Mark read |
| POST | `/v1/push/subscribe` | any | Store web-push subscription |
| GET | `/v1/analytics/summary` | admin | Headline tiles |
| GET | `/v1/analytics/businesses` | admin | Businesses by NZBN |
| GET | `/v1/analytics/businesses/{nzbn}/users` | admin | Drill-down (no demographics) |
| GET | `/v1/analytics/demographics` | admin | Aggregate-only (k-anonymised) |
| GET | `/v1/analytics/categories` | admin | Risk themes |
| GET | `/v1/analytics/trend` | admin | Weekly trend |
| GET | `/v1/analytics/export` | admin | CSV / XLSX / PDF |
| DELETE | `/v1/companies/{nzbn}` | platform | Bulk-delete business |
| GET | `/v1/nzbn/search?q=` | any (proxy) | NZBN name search |
| GET | `/v1/nzbn/{nzbn}` | any (proxy) | NZBN → name |
| GET | `/v1/system/sync-events` | scoped | Diagnostics |
| GET | `/v1/system/errors` | scoped | Diagnostics |
| GET | `/health` | none | Liveness/readiness |

---

## 8. Non-functional & cross-cutting requirements

- **Privacy (hard requirement).** NZ **Privacy Act 2020**. ACC-funded reporting is **aggregate-only** — *no individual demographic data is visible to anyone, including the platform owner* (enforced server-side, not just hidden in UI). Apply k-anonymity minimum cohort thresholds on demographic aggregates. Anonymity of concerns is server-enforced (§4.2).
- **Data residency / sovereignty.** ACC + government context → **New Zealand data residency** is likely mandated. **Decision needed** with the client. Constrains cloud region/provider (Azure NZ North, AWS/Catalyst Cloud NZ, etc.).
- **Security.** OWASP ASVS baseline; input validation on every endpoint; parameterised queries; signed, time-limited media URLs; malware scanning on uploads; secrets in a vault (not `.env` in prod); rate limiting; CORS locked to the PWA origin; audit log for all mutations + admin actions; encryption at rest and in transit.
- **Multi-tenancy.** Company-level isolation enforced at the data-access layer.
- **Offline correctness.** Idempotency keys, monotonic server refs, clear captured-vs-synced timestamps (§6.7).
- **Internationalisation / te reo Māori.** Content model must carry māori labels (`maoriLabel`) and bilingual content (Ako Kōrero). Keep text data-driven.
- **Observability.** Structured logging, request tracing, health checks, metrics; error + sync telemetry surfaced to `SystemStatus`.
- **Performance / scale.** Mobile-first, often poor connectivity — small payloads, pagination on lists, cache-friendly GETs.
- **Accessibility & PWA parity.** Backend must support the installable/offline shell (correct cache headers, push).
- **Testing.** Unit + integration tests, contract tests against the Circle contract, seed/fixture parity with `mockData.ts`.
- **CI/CD.** Automated build/test/deploy; migrations; environment promotion (dev → staging → prod).

---

## 9. Recommended tech stack

`.env` states the domain backend is "our own **.NET API**", so:
- **Runtime/framework:** .NET 8 (LTS) · ASP.NET Core Web API (Minimal APIs or Controllers).
- **ORM/DB:** EF Core + **PostgreSQL** (or SQL Server if the org standard). Migrations via EF.
- **Auth:** `Microsoft.AspNetCore.Authentication.JwtBearer` validating Circle's JWKS.
- **Storage:** Azure Blob Storage (or S3-compatible / NZ-resident equivalent) for photos & hazard images.
- **Push:** WebPush (VAPID) library.
- **Exports:** CsvHelper (CSV), ClosedXML/EPPlus (XLSX), QuestPDF (PDF).
- **Hosting:** container (Docker) on an **NZ-resident** region pending the residency decision.
- **Observability:** OpenTelemetry + Serilog.

*(These are recommendations; confirm against org standards in §11.)*

---

## 10. Configuration & environments

Frontend flags already defined (`.env.example`):
- `VITE_USE_MOCK` — `true` (prototype) / `false` (live).
- `VITE_CIRCLE_API_BASE` — Circle base URL (required when live).
- `VITE_API_BASE` — NQR domain backend base URL (required when live).

Backend config needed: DB connection, blob storage credentials, Circle JWKS/issuer/audience, NZBN API key, VAPID keys, allowed CORS origins, environment name. Store secrets in a vault per environment (dev / staging / prod).

---

## 11. Open decisions (resolve before/early in build)

1. **Circle auth mechanism & OTP** — email OTP vs SMS OTP (README: undecided). Blocks login UX + any OTP handling. *(Blocking)*
2. **Circle token validation** — JWKS vs introspection; token lifetime/refresh. *(Blocking for §6.1)*
3. **Data residency** — is NZ residency mandated? Sets cloud provider/region. *(Blocking for §9 hosting)*
4. **User management split** — which actions are ours vs Circle's (§6.10).
5. **Photos in V1?** — README says yes; current UI doesn't wire it. Confirms §6.6 + a small frontend task. 
6. **NZBN integration** — direct vs proxied; obtain API key (§6.13).
7. **Profile field ownership** — which of dob/gender/industry/isHSR/nzbn Circle stores vs we capture (§5.5).
8. **Anonymity de-anonymisation** — is there ever a sealed audit path? (§4.2)
9. **Company-Owner surface** — stay mapped to admin, or build a dedicated experience later? (`toAppRole`)
10. **Profile mirror** — persist a local mirror for analytics/perf, or read live from Circle? (§4.1)
11. **Confirm .NET stack specifics** (DB engine, cloud, libraries) against org standards.

---

## 12. Delivery plan (phased)

Ordered so each phase produces something demonstrable and unblocks the next. Each phase pairs backend work with the matching frontend "flip a flag" integration.

### Phase 0 — Foundations & decisions (spike)
- Resolve blocking decisions #1–#3, #6, #11 (§11) with client + Circle.
- Hand Circle the API contract (§5); get JWKS/issuer/audience.
- Stand up the .NET solution skeleton, DB, migrations, CI/CD, health check, `/v1` versioning, structured logging.
- **Exit:** empty API deploys to a dev environment; auth middleware validates a real Circle token.

### Phase 1 — Identity plumbing & read-only catalogues
- Implement Circle token validation + role mapping + tenant scoping (§6.1).
- `GET /me/profile`; profile mirror upsert (§6.2).
- Seed + serve **hazards**, **prompts**, **ako-korero** (§6.3–6.4, 6.11); migrate images to blob storage.
- Frontend: implement real `circleProvider` endpoints; wire `apiFetch` for catalogues; flip `VITE_USE_MOCK=false` in a test env.
- **Exit:** the app logs in via Circle and renders live hazards/prompts.

### Phase 2 — Core concern loop (the heart)
- `POST/GET /concerns`, `/concerns/{id}`, status/close/actions (§6.5) with routing, server refs, cycle-time, anonymity projection, notifications-on-events.
- Notifications list + read-all (§6.8, without push yet).
- Frontend: replace `AppContext` concern mutations with API-backed hooks (react-query is already a dependency).
- **Exit:** end-to-end worker→supervisor→close loop on live data; worker sees the real response.

### Phase 3 — Media & offline sync
- Media upload + signed retrieval + scanning (§6.6).
- Idempotent create + `POST /sync` batch ingest; captured-vs-synced timestamps; sync-event telemetry (§6.7).
- Frontend: IndexedDB queue + Background Sync + service-worker wiring; add photo capture if in scope (#5).
- **Exit:** raise a concern offline (with photo), reconnect, it syncs exactly once and appears for the supervisor.

### Phase 4 — Analytics, admin & push
- Analytics endpoints + aggregate-only demographics with k-anonymity + exports (§6.9).
- Admin users read-through + company delete (§6.9–6.10).
- Web Push (VAPID) + subscribe endpoint + SW push handler (§6.8).
- NZBN proxy + live registry (§6.13).
- **Exit:** admin analytics render from live aggregates; exports work; push notifications deliver.

### Phase 5 — Hardening & launch
- Security review (OWASP ASVS), privacy/DPIA sign-off, load/perf testing, audit-log verification, penetration test.
- Full contract tests vs Circle; migration/runbook; monitoring/alerting.
- **Exit:** production-ready, residency-compliant, ACC privacy requirements demonstrably met.

---

## 13. Risks

- **Circle dependency** — auth/hierarchy is external and partly undecided; a slip there blocks Phases 1–2. *Mitigate:* keep the mock provider working in parallel; agree the contract early; build against a Circle stub.
- **Privacy/ACC compliance** — aggregate-only + anonymity are non-negotiable and easy to get subtly wrong (small cohorts, leaky joins). *Mitigate:* server-enforced k-anonymity, DPIA, review before Phase 4 ships.
- **Data residency** — a late "must be in NZ" decision can force a provider change. *Mitigate:* resolve in Phase 0.
- **Offline dedupe** — duplicate concerns from retried syncs erode trust. *Mitigate:* idempotency keys + server refs from day one (Phase 2/3).
- **Scope creep from V2** — escalation/edit/reopen/questionnaire are explicitly out. *Mitigate:* hold the §3 boundary.

---

## 14. Frontend follow-on tasks (paired, for reference)
Not backend, but needed to consume it (from README "Next phase"):
- Replace `AppContext` in-memory store + `mockData` with API-backed react-query hooks.
- Implement live `circleProvider` (SSO redirect + token handling).
- IndexedDB persistence + Background Sync (true offline).
- Service-worker `push` handler for Web Push.
- Photo picker in `HazardReport` (if photos are in V1).
