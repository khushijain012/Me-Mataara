# NQR — Not Quite Right

A frontline workplace-safety **Progressive Web App**. If a worker spots something that's *not quite
right* on site, they raise it in a few taps, it goes straight to their supervisor, the supervisor
responds and closes the loop, and the exchange becomes a ready-made toolbox-talk topic. **NQR** is
part of the wider **Me Mataara** ecosystem and is funded by ACC.

> **Status:** UI/UX prototype (frontend only). All data is **mock / in-memory** (registration &
> session persist to `localStorage`). There is **no backend or API** — identity/auth is paused
> pending the Me Mataara (Circle) integration answer.

## Scope — the V1 loop

Built strictly to the client clarifications document:

- **Self-registration** — first/last name, DOB, mobile, email, **NZBN** (by company-name lookup),
  a health-&-safety-role tick-box, optional worker number, and optional demographics (gender, age
  group, **industry**). Low-friction by design.
- **Report something Not Quite Right** — pick a risk from a fixed list, each **with its image**,
  add a photo, optionally raise it **anonymously**, and send it to your supervisor.
- **Concern loop** — status **Open / In Progress / Closed** visible to the worker; the worker sees
  the supervisor's actual response. No editing / reassigning / reopening in V1.
- **Supervisor** — inbox, respond with **preset prompts** or a custom message, close with an outcome;
  a **Toolbox** view showing a rolling **four-week** window of concerns with images + responses and
  the **cycle-time** metric.
- **Platform admin** — user management, an **Analytics** view (NZBN businesses, user counts,
  drill-down to users, aggregate-only demographics), risk/image management, and close-concern rights.
- **Offline** — a report raised with no signal is held on-device and **sends automatically** on
  reconnect.

> **Not in V1 (removed / deferred):** no daily safety questionnaire; no Leader role; escalation,
> editing/reassign/reopen, and theme-level aggregate reporting are Version 2.

## Brand

Me Mataara guide: **Green Stone** `#4F878F`, **Gravel** `#BAB9B4`, **Slate** `#DAE2E2`,
**Charcoal** `#404040`, **Mustard** `#CAA545`; typeface **Quicksand**; the four-colour pinwheel
brandmark.

## Tech

React 18 + TypeScript · Vite 6 · Tailwind CSS (Me Mataara palette) · React Router · Recharts ·
vite-plugin-pwa (installable shell) · lucide-react.

## Getting started

Install and run from the **repo root** — this package is an npm workspace, so it has no
`node_modules` or lockfile of its own:

```bash
npm install
```

```bash
npm run dev:web
```

`npm run dev` at the root starts this app *and* the API together. `npm run gen:icons` regenerates
the PWA png icons. See the [root README](../README.md) for the full script list.

## Demo affordances

- **Role switcher** (top-bar menu) — explore Worker / Supervisor / Admin.
- **Online/Offline toggle** (top bar or System status) — go offline, raise a concern, see *pending sync*.
- Sign in with the mobile you registered (persisted in `localStorage`).

## Next phase (needs backend — out of current scope)

- Replace the in-memory store (`src/context/AppContext.tsx`) and mocks (`src/lib/mockData.ts`) with
  API-backed hooks.
- Identity/auth once Circle's IAM pattern is confirmed (email OTP vs SMS OTP — currently undecided).
- Live NZBN registry lookup and Me Mataara (Circle) identity link.
- True offline persistence (IndexedDB + Background Sync).
