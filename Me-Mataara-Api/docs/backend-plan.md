# NQR Backend — Implementation Plan

**Project:** NQR ("Not Quite Right") — Me Mataara health & safety micro-app
**Component:** Backend API
**Status:** Plan — not yet scaffolded
**Date:** 2026-08-07
**Repo:** `D:\Nax-D\Me-Mataara-Api` (standalone; independent of the Euro/FieldTrix codebase)

---

## 1. Context

NQR is a health & safety PWA in the Me Mataara ecosystem (Circle.so community, ACC-funded). The frontend already exists as a standalone React 18 + TypeScript + Vite PWA at `D:\Nax-D\Me-Mataara`. It is currently **frontend-only** — all data is in-memory and persisted to `localStorage`; there are no network calls anywhere in the app.

This document plans the backend that will replace that mock layer.

The core V1 loop the backend must support:

> Worker registers → spots something Not Quite Right → picks a risk from a fixed catalogue → optionally attaches a photo → optionally submits anonymously → routed to their supervisor → supervisor responds (preset prompt or custom) → closes with an outcome. In V1 a closed concern **stays closed** (no reopen/edit/reassign).

---

## 2. Guiding decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Backend home** | Standalone .NET 8 API in its own git repo, sibling to the frontend | Preserves NQR's deliberate separation from other products; team knows the stack |
| **Euro/FieldTrix** | **Completely excluded** | No code copied, no shared projects, no dependency, no references. Generic .NET conventions only. |
| **Stack** | .NET 8 · ASP.NET Core Web API · EF Core 8 + Npgsql (PostgreSQL) · JWT · BCrypt/Argon2 | Standard, well-supported, matches team familiarity |
| **Auth** | Provisional mobile + password now, behind a swappable interface | Circle.so IAM answer still pending; unblocks the build without pre-committing |
| **Multi-tenancy** | Lightweight — a `BusinessOrgId` FK + role-based query filters | NQR does not need heavyweight tenant/client/access-scope machinery |

---

## 3. Prerequisite (blocking) — pin the frontend contract

The frontend domain model is **not yet stable**, and the backend DTOs must mirror it. Before backend code is written:

1. **Reconcile `src/lib/types.ts`.** The file on disk is older than what the app actually consumes. The real `Concern` uses `title`, `severity`, `site`, `location`, `photo`, `photoData`, `photoMeta`, `closureOutcome`; and the types `Severity`, `ClosureOutcome`, `ImageMeta`, `Telemetry`, `OnboardingSlide` are referenced across the app but not defined. The app would not currently type-check.
2. **Recover the full `ClosureOutcome` enum** — only `controls_in_place` is currently discoverable.
3. **Recover the `OnboardingSlide` shape** — the defining file and `OnboardingPage.tsx` / `IntroVideo.tsx` / `AdminOnboarding.tsx` are missing from disk.

The reconciled `types.ts` becomes the single source of truth the backend contract is derived from.

---

## 4. Architecture & project layout

Start with a single, well-foldered API project. Split into `Nqr.Api` / `Nqr.Core` / `Nqr.Infrastructure` later only if the layering earns it.

```
Nqr.Api/
  Domain/          Entities: BusinessOrg, Member, Hazard, Concern, CorrectiveAction, …
  Data/            NqrDbContext + Migrations/   (EF migrations startup project)
  Dtos/            Request/response models mirroring the reconciled types.ts
  Repositories/    IConcernRepository + ConcernRepository, etc.
  Services/        AuthService (swappable), NzbnClient, NotificationService, RefAllocator
  Controllers/     One per resource
  Program.cs
```

---

## 5. Domain model

Scoping is a `BusinessOrgId` foreign key plus role-based query filters — no heavyweight tenancy.

| Entity | Key fields | Notes |
|---|---|---|
| **BusinessOrg** | `Id`, `Nzbn` (unique), `Name`, `Industry` | Auto-created / linked on registration by NZBN. Drives admin analytics. |
| **Member** | Identity (`FirstName`, `LastName`, `Dob`, `Mobile`, `Email`), `PasswordHash`, `Role` (worker / supervisor / admin), `Gender`, `AgeBand`, `Industry`, `IsHSR`, `WorkerNumber?`, `BusinessOrgId`, `SupervisorId?`, `ApprovalStatus` (approved / awaiting), `VerificationStatus`, `JoinedMeMataara` | = the frontend `RegisteredProfile`. A supervisor is a Member with role + approval status. "Claim your supervisor" = the `SupervisorId` link. |
| **Hazard** (risk catalogue) | `Label`, `MaoriLabel`, `Icon`, `ImageUrl`, `Description`, `Tint`, `Active`, `SortOrder` | **Global** — admin edits go live to all field users. Image stored in blob storage, not as a data-URL. |
| **Concern** | `Ref` (HZ-####), `CategoryId`, `RiskIds[]`, `Title`, `Description`, `Severity`, `Status`, `Site`, `Location`, `SceneDate?`, `ReportedById?`, `ReportedAnonymous`, `ReportedAt`, `SupervisorId?`, `ClosedAt?`, `TimeToCloseHours?`, `RiskReduction?`, `ClosureOutcome?`, `PhotoUrl?`, `PhotoMeta`, sync fields (`ClientDedupeKey`, `CapturedAt`, `SyncedAt`) | The core aggregate. Server owns `Ref`, supervisor routing, and `TimeToCloseHours`. |
| **CorrectiveAction** | `ConcernId`, `Author`, `Role`, `Message`, `At`, `PromptId?`, `ResponseType` (preset / custom) | Child of Concern — the supervisor/worker responses. |
| **SupervisorPrompt** | `Label`, `SortOrder`, `Active` | Admin-managed preset responses. |
| **AkoKorero** | `Title`, `Body`, `SortOrder` | Admin-managed cultural learning content. |
| **OnboardingSlide** | Shape TBD (recover in §3) | Admin-managed onboarding content. |
| **AppNotification** | `MemberId`, `Kind`, `Title`, `Body`, `At`, `Read`, `ConcernRef?` | Per-user notifications. |
| **TelemetryEvent** | `MemberId`, `Type`, `Meta` (json), `At` | Engagement analytics — flatten the frontend `Telemetry` blob into rows. |

`SyncEvent` and `ErrorLog` stay device-side (offline-resilience UI). The server only needs an **idempotent sync endpoint** keyed on `ClientDedupeKey`.

---

## 6. API surface

Maps 1:1 onto the frontend `AppContext` actions.

| Area | Endpoints |
|---|---|
| **Auth** | `POST /auth/register` · `POST /auth/login` · `POST /auth/logout` · `GET /me` |
| **NZBN** (external proxy) | `GET /nzbn/search?name=` · `GET /nzbn/{nzbn}` — proxy to nzbn.govt.nz, replacing the mock `searchNzbnByName` |
| **Concerns** (core loop) | `GET /concerns` (role-scoped) · `GET /concerns/{ref}` · `POST /concerns` · `PATCH /concerns/{id}/status` · `POST /concerns/{id}/close` · `POST /concerns/{id}/actions` · `POST /concerns/{id}/photo` |
| **Offline sync** | `POST /concerns/sync` (batch, idempotent) |
| **Admin content** | CRUD for `/hazards` (+ reorder, toggle active, replace image), `/prompts`, `/ako-korero`, `/onboarding` |
| **Admin users / analytics** | `GET /admin/members` · bulk delete · per-business delete · supervisor approval · `GET /analytics/overview` (businesses, counts, category breakdown, weekly trend, **aggregate-only** demographics) · CSV / Excel / PDF export |
| **Notifications** | `GET /notifications` · `POST /notifications/mark-all-read` · `POST /push/subscribe` (Web Push) |
| **Telemetry** | `POST /telemetry/track` (batch) |

---

## 7. Business rules the server must own

These currently live on the client and must move server-side:

- **`HZ-####` reference allocation** — atomic sequence (the frontend currently does `max + 1`, which is race-prone).
- **Password hashing** — drop the client-side SHA-256; hash with BCrypt/Argon2 server-side. The client sends the raw password over TLS only.
- **`TimeToCloseHours`** — computed at close time from `ReportedAt`.
- **Supervisor routing** — `ReportedById` → `Member.SupervisorId`, with a fallback default supervisor.
- **Closed-stays-closed (V1)** — reject reopen / edit / reassign of closed concerns.
- **Anonymous handling** — when `ReportedAnonymous` is set, never expose the reporter's identity in supervisor-facing responses (retain the link server-side; gate the projection).
- **Role-scoped reads** — worker sees own; supervisor sees assigned crew; admin sees all.

---

## 8. Auth strategy

Everything sits behind an `IAuthService` / `IIdentityProvider` interface:

- **Now:** `PasswordIdentityProvider` — mobile + password (BCrypt/Argon2), issues a JWT with `sub`, `role`, and `businessId` claims.
- **Later:** drop in `CircleSsoProvider` or `OtpProvider` without touching controllers, once the Circle.so IAM decision lands.

The JWT claim shape (`role`, `businessId`) is what the role-scoped queries key off, so it stays stable across the swap. SMS is net-new (no SMS logic exists anywhere yet) and is deferred to the same swap.

---

## 9. External integrations

- **NZBN name search** — proxy to nzbn.govt.nz, replacing the mock `searchNzbnByName` / `lookupNzbn`. Store the resolved NZBN behind the company-name pick.
- **Web Push** — browser Notification API subscription endpoint (in-app notifications are primary; push is secondary).
- **SMS** (deferred, Phase 5) — no SMS logic exists yet; net-new work tied to the Circle/auth swap.
- **Photo storage** — blob/object storage; the concern holds a `PhotoUrl`, not an inline data-URL.

---

## 10. Phased roadmap

| Phase | Scope |
|---|---|
| **0 — Bootstrap** | Reconcile `types.ts` (pin contract) → scaffold solution → `NqrDbContext` + first migration → `IAuthService` + register/login/`GET /me` → Swagger → CORS for the Vite dev origin |
| **1 — Core loop (the demo)** | Hazards (read) + Concerns create/list/detail + actions + close + routing + ref allocation — the full worker → supervisor → close loop end-to-end |
| **2 — Registration & orgs** | NZBN proxy, `BusinessOrg` auto-link, supervisor claim + approval gating |
| **3 — Admin** | Content CRUD (hazards / prompts / ako-korero / onboarding), member admin + bulk delete, analytics + exports |
| **4 — Resilience & engagement** | Idempotent offline sync, notifications + Web Push, telemetry |
| **5 — Deferred** | SMS fallback, Circle SSO swap |

---

## 11. Frontend seam (parallel work)

The frontend has **no API layer** — `AppContext` is entirely in-memory / `localStorage`, with no `fetch`/`axios` calls. To connect the backend:

1. Introduce a `src/lib/api/` client.
2. Refactor `AppContext`'s actions to call it.
3. Gate behind an env flag (`VITE_USE_MOCK`) so mock and live modes coexist during the transition.

Plan this as a companion frontend task, per phase.

---

## 12. Getting started

The .NET toolchain is not on the default PATH in this environment. Prefix commands with:

```bash
$env:Path = "C:\Program Files\dotnet;$env:USERPROFILE\.dotnet\tools;" + $env:Path
```

Bootstrap Phase 0:

```bash
dotnet new webapi -n Nqr.Api -o D:\Nax-D\Me-Mataara-Api\Nqr.Api
cd D:\Nax-D\Me-Mataara-Api\Nqr.Api
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package BCrypt.Net-Next
```

Then: add `NqrDbContext` and the `Concern` / `Hazard` / `Member` entities, set the Postgres connection string in `appsettings.Development.json`, generate the first migration, and build Phase 0's auth + `GET /me`.

---

## 13. Open questions / blockers

1. **Contract reconciliation** (`types.ts`) — blocking; must precede backend DTOs.
2. **`OnboardingSlide` shape** and the **full `ClosureOutcome` enum** — currently undiscoverable in the frontend.
3. **Circle.so IAM decision** — gates the final auth model (provisional password auth unblocks everything else in the meantime).
4. **Photo storage target** — which blob/object store (e.g. Azure Blob) to use.
