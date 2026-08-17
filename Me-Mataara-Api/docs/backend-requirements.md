# NQR Backend — Requirements Specification

**Project:** NQR ("Not Quite Right") — Me Mataara health & safety micro-app
**Component:** Backend API
**Document type:** Requirements specification
**Status:** Draft
**Date:** 2026-08-07
**Scope note:** Independent of the Euro/FieldTrix codebase.

---

## 1. Purpose & scope

This document specifies **what** the NQR backend must do to replace the frontend's current in-memory / `localStorage` mock layer with a persistent, multi-user service. It defines functional requirements, data requirements, business rules, integration requirements, and non-functional requirements. It deliberately does **not** prescribe implementation (architecture, frameworks, project layout) — see the separate implementation plan for that.

Requirements are identified as **FR** (functional), **DR** (data), **BR** (business rule), **IR** (integration), and **NFR** (non-functional) for traceability.

---

## 2. Actors

| Actor | Description |
|---|---|
| **Worker** | Registers, reports concerns ("something Not Quite Right"), views their own concerns and statuses. |
| **Supervisor** | Approved member who receives concerns from their claimed crew, responds, and closes them. |
| **Admin** (platform owner) | Manages the hazard catalogue, preset prompts, cultural content and onboarding; manages members; views aggregate analytics. |
| **Anonymous reporter** | A worker submitting a concern without revealing their identity to the supervisor. |
| **External system** | NZBN business register (nzbn.govt.nz); web-push service. |

---

## 3. Assumptions & constraints

- **AS-1** The authoritative domain model is the reconciled frontend `types.ts`. Backend contracts must mirror it once reconciled.
- **AS-2** Authentication is provisional (mobile + password) pending the Circle.so IAM decision; the backend must not hard-code an auth model that prevents a later swap to SSO/OTP.
- **AS-3** The frontend currently performs certain logic (reference allocation, password hashing, close-time calculation) that must move server-side.
- **CN-1** The service must not depend on, reference, or share code with the Euro/FieldTrix codebase.
- **CN-2** The project is ACC-funded and part of the Me Mataara ecosystem; data handling must satisfy NZ privacy expectations (see §9).
- **CN-3** Any risk/hazard label content and cultural (Ako kōrero) content is admin-controlled and may include te reo Māori; the system must store and serve it faithfully (Unicode).

---

## 4. Functional requirements

### 4.1 Registration & authentication

- **FR-1** The system shall allow a worker to self-register with: first name, last name, date of birth, mobile, email, company (via NZBN name lookup), industry, health-&-safety-role flag, optional worker number, optional gender, a claimed supervisor, a password, and a Me Mataara opt-in flag.
- **FR-2** The system shall derive and store age and age-band from date of birth.
- **FR-3** The system shall reject registration missing any mandatory field (name, DOB, mobile, email, company/NZBN, industry, password). Worker number, gender, HSR flag, and supervisor claim are optional and shall never block registration.
- **FR-4** The system shall authenticate a member by mobile + password and issue a session token carrying the member's role and business association.
- **FR-5** The system shall expose the authenticated member's profile ("me").
- **FR-6** The system shall support logout (session/token invalidation as applicable).
- **FR-7** The authentication mechanism shall be replaceable (e.g. Circle SSO / OTP) without changing the concern, admin, or analytics functionality.

### 4.2 Business / organisation

- **FR-8** On registration, the system shall link the member to a business identified by NZBN, creating the business record if it does not already exist.
- **FR-9** The system shall record each business's NZBN, name, and industry for analytics and administration.

### 4.3 Supervisor claim & approval

- **FR-10** The system shall let a worker claim a supervisor from the list of supervisors.
- **FR-11** The system shall represent supervisor approval status (approved / awaiting approval) and expose it so the UI can show an "awaiting approval" state.
- **FR-12** The system shall route a worker's concerns to their claimed supervisor; where none is claimed, it shall route to a configured default supervisor.
- **FR-13** The system shall let a supervisor see their claimed crew and identify unclaimed members ("to chase").

### 4.4 Hazard (risk) catalogue

- **FR-14** The system shall serve the catalogue of hazards/risks, each with an English label, a nickname (te reo/Māori label), an icon, an image, a description, a display tint, and an active flag.
- **FR-15** The catalogue shall be global (shared across all businesses and field users).
- **FR-16** Admin changes to the catalogue (add, edit, replace image, reorder, activate/deactivate) shall take effect for field users without redeployment.

### 4.5 Concern lifecycle (core loop)

- **FR-17** The system shall let a worker create a concern with: one or more selected risks (a primary category plus risk IDs), a title, a description, a severity, a site, a location, an optional "when noticed" date, an optional photo, and an anonymity flag.
- **FR-18** The system shall assign each concern a unique human-readable reference of the form `HZ-####`.
- **FR-19** The system shall record who reported the concern and when, and route it to the appropriate supervisor.
- **FR-20** The system shall track concern status as Open, In Progress, or Closed.
- **FR-21** The system shall let a supervisor add a response to a concern, either selecting a preset prompt or entering custom text, recording which was used.
- **FR-22** Adding the first response to an Open concern shall move it to In Progress.
- **FR-23** The system shall let a supervisor close a concern with a closure outcome, recording the closure timestamp and the resulting risk reduction.
- **FR-24** The system shall compute and store the time-to-close (cycle time) at closure.
- **FR-25** A worker shall be able to view their own concerns and each concern's current status and the supervisor's actual response.
- **FR-26** A supervisor shall be able to view the concerns assigned to them.

### 4.6 Supervisor toolbox / signals

- **FR-27** The system shall provide a supervisor a rolling four-week view of concerns (most recent first) with image, response, and cycle time.
- **FR-28** The system shall provide supervisor signals: number raised, number closed, average time-to-close, and percentage responded.

### 4.7 Notifications

- **FR-29** The system shall create an in-app notification to the supervisor when a new concern is raised.
- **FR-30** The system shall create an in-app notification when a concern is closed.
- **FR-31** The system shall let a member list their notifications and mark all as read, and expose an unread count.
- **FR-32** The system shall support web-push delivery as a secondary channel (in-app is primary).
- **FR-33** SMS fallback is a future requirement (see §10) and is not required for the initial release.

### 4.8 Offline capture & sync

- **FR-34** The system shall accept a batch of concerns captured offline and reconcile them, reporting a per-batch sync result (success/failure and count).
- **FR-35** Sync shall be idempotent: re-submitting the same captured concern shall not create a duplicate.

### 4.9 Admin content management

- **FR-36** The system shall let an admin manage (create, edit, reorder, activate/deactivate) the hazard catalogue, the supervisor preset prompts, the Ako kōrero cultural content, and the onboarding content.

### 4.10 Admin members & analytics

- **FR-37** The system shall let an admin list members and delete members (including bulk delete and per-business delete).
- **FR-38** The system shall provide aggregate analytics: registered businesses, user counts, category breakdown, and a weekly trend of raised vs. closed concerns.
- **FR-39** Demographic analytics (e.g. gender, age band) shall be **aggregate-only**, with no individual-level demographic data exposed.
- **FR-40** The system shall support exporting analytics as CSV, Excel, and PDF.

### 4.11 Telemetry

- **FR-41** The system shall accept engagement telemetry events (e.g. interactions, URL clicks, video progress, concerns raised) for analytics.

---

## 5. Data requirements

- **DR-1** The system shall persist: businesses, members, the hazard catalogue, concerns, corrective actions/responses, supervisor prompts, Ako kōrero content, onboarding content, notifications, and telemetry events.
- **DR-2** Passwords shall be stored only as a strong one-way hash — never in plaintext and never as the frontend's SHA-256 scheme.
- **DR-3** Concern references (`HZ-####`) shall be unique across the system.
- **DR-4** NZBN shall be unique per business.
- **DR-5** Photos shall be stored in object/blob storage; concerns shall reference the stored image, not embed it inline.
- **DR-6** For anonymous concerns, the reporter linkage shall be retained server-side but shall not be exposed in any supervisor- or admin-facing view.
- **DR-7** Text content shall support full Unicode (te reo Māori macrons, etc.).
- **DR-8** The full set of closure outcomes and the onboarding-content shape must be confirmed from the frontend before persistence is finalised (see §11).

---

## 6. Business rules

- **BR-1** Reference allocation is server-owned and collision-free (not client-side "max + 1").
- **BR-2** Password hashing and verification are performed server-side.
- **BR-3** Time-to-close is computed server-side from the report time at the moment of closure.
- **BR-4** A concern is routed to the reporter's claimed supervisor, falling back to a configured default when none is claimed.
- **BR-5** In V1, a **closed concern stays closed** — no reopen, edit, or reassignment.
- **BR-6** Read access is role-scoped: a worker sees only their own concerns; a supervisor sees only concerns assigned to them; an admin sees all.
- **BR-7** An anonymous concern's reporter identity is never revealed to supervisors or admins.
- **BR-8** A newly created concern starts Open; the first response moves it to In Progress; closure moves it to Closed.

---

## 7. Integration requirements

- **IR-1** The system shall provide a business-name search that proxies the NZBN register (nzbn.govt.nz), returning candidate matches, and shall resolve a selected match to its NZBN.
- **IR-2** The system shall integrate a web-push service for secondary notification delivery.
- **IR-3** The system shall integrate object/blob storage for concern photos.
- **IR-4** (Future) The system shall integrate an SMS provider for fallback notifications.
- **IR-5** (Future) The system shall integrate Circle.so IAM / SSO once the identity decision is confirmed.

---

## 8. Non-functional requirements

- **NFR-1 (Security)** All traffic shall be over TLS. Endpoints shall enforce authentication and role-based authorisation per BR-6. Public endpoints (registration, NZBN search, anonymous submission) shall be explicitly designated and rate-limited.
- **NFR-2 (Privacy)** The system shall comply with NZ Privacy Act expectations: collect only the specified fields, expose demographics only in aggregate (FR-39), and honour anonymity (BR-7). Personal data shall never be placed in URLs/query strings.
- **NFR-3 (Data protection)** Passwords hashed (DR-2); personal data access restricted to the owning member, their supervisor (non-anonymous concerns only), and admins.
- **NFR-4 (Availability & offline)** The service shall support the frontend's offline-first behaviour via idempotent sync (FR-34/35) so field capture survives connectivity loss.
- **NFR-5 (Performance)** List and detail reads for concerns, hazards, and notifications shall respond within acceptable interactive latency under expected field load.
- **NFR-6 (Scalability)** The data model shall support many businesses and members without cross-business data leakage (business-scoped queries).
- **NFR-7 (Auditability)** Creation and modification of concerns and responses shall be timestamped and attributable (subject to anonymity).
- **NFR-8 (Portability of auth)** Per AS-2/FR-7, the auth mechanism shall be swappable without functional regression.
- **NFR-9 (Localisation)** The system shall faithfully store and serve bilingual (English / te reo Māori) content.
- **NFR-10 (Accessibility support)** The API shall not obstruct the frontend's accessibility (e.g. it shall provide the text and metadata the UI needs; no logic that forces inaccessible flows).

---

## 9. Privacy & compliance notes

- Anonymity is a first-class feature (BR-7, DR-6): the reporter link is retained for integrity but never surfaced.
- Demographic reporting is aggregate-only (FR-39) — no drill-down to an individual's gender/age.
- Only the registration fields listed in FR-1 are collected; no compilation of personal data beyond them.

---

## 10. Out of scope / deferred

- **OOS-1** SMS notifications (future — no SMS logic exists yet).
- **OOS-2** Circle.so SSO / OTP authentication (future — pending IAM decision).
- **OOS-3** Reopen / edit / reassign of closed concerns (excluded from V1 by BR-5).
- **OOS-4** In-app bot, daily safety check, and the Leader/Rangatira role (removed from product scope).

---

## 11. Open items (to confirm before build)

1. **Contract reconciliation** — the frontend `types.ts` must be reconciled into a complete, stable model; backend contracts derive from it. (Blocking.)
2. **Full `ClosureOutcome` set** — only one outcome is currently discoverable in the frontend.
3. **Onboarding-content shape** — the defining frontend artefacts are missing.
4. **Auth decision** — Circle.so IAM answer (provisional password auth applies until then).
5. **Photo storage target** — which object/blob store.
6. **Data retention policy** — how long concerns, photos, and telemetry are retained.
