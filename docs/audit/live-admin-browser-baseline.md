# Live Admin Browser Baseline — AQUAVO

**Target:** https://www.aquavoiq.com (LIVE production)
**Mode:** Strictly READ-ONLY — navigation, reads, and GET probes only. No forms submitted, no orders created, no exports/emails triggered.
**Date:** 2026-07-21
**Auditor:** Browser/API Auditor

---

## 1. Tooling Status

| Item | Status |
|------|--------|
| `@playwright/test` | v1.57.0 installed (`node_modules/.pnpm/@playwright+test@1.57.0`) |
| Chromium browser | Present (`chromium-1228` etc. in `~/AppData/Local/ms-playwright`) — no install needed |
| Headless launch vs. live site | **Working** — successfully loaded https://www.aquavoiq.com/ (HTTP 200, title read) |
| Network to production | Reachable |

Baseline was run via a throwaway ESM script kept in the OS scratch dir (NOT committed). It launched a **fresh unauthenticated browser context per route** (no cookies/session carried over).

---

## 2. Unauthenticated Route Baseline

> Note: the app is a **client-side SPA**. The server returns HTTP `200` with the app shell for every route; the "redirect" for admin routes happens **in the browser** (Wouter `<RequireAdmin>` guard), which is why `finalUrl` differs from the requested URL while status stays 200.

| Requested Route | HTTP | Final URL (after client render) | Redirected to login? | Page Title | Console Errors |
|-----------------|------|----------------------------------|----------------------|------------|----------------|
| `/` | 200 | `/` | n/a (public) | معدات أحواض بريميوم بالعراق \| AQUAVO ... | none |
| `/admin/login` | 200 | `/admin/login` | n/a (login page) | AQUAVO — مستلزمات أحواض الزينة ... | none |
| `/admin` | 200 | `/admin/login` | **YES** ✅ | (login page title) | none |
| `/admin/finance` | 200 | `/admin/login` | **YES** ✅ | (login page title) | none |

Client-side guard source: `client/src/App.tsx` — `/admin`, `/admin/finance`, `/admin/partners` are all wrapped in `<RequireAdmin>`, `/admin/login` is not.

---

## 3. Server-Side API Gating (read-only GET probes)

The client redirect alone is cosmetic — the real security boundary is the API. Unauthenticated `curl` GET probes (no cookies):

| Endpoint | HTTP (unauth) | Verdict |
|----------|---------------|---------|
| `GET /api/admin/orders` | **401** | ✅ Gated |
| `GET /api/admin/stats` | **401** | ✅ Gated |
| `GET /api/admin/customers` | **401** | ✅ Gated |
| `GET /api/orders` | **401** | ✅ Gated |
| `GET /api/admin/finance/audit/latest` (real finance endpoint) | **401** | ✅ Gated |
| `GET /api/finance/summary` | 404 | Not a route — wrong path guess, not a gap. Real finance API is under `/api/admin/finance/...` (`server/routes/finance-audit.ts`). |

**Result: admin and financial data are properly auth-gated at BOTH the client (redirect) and server (401) layers.** No admin/finance data was reachable without authentication.

---

## 4. Admin Login Form Selectors (for the future authenticated run — NOT submitted)

From `client/src/pages/admin-login.tsx` and confirmed live at `/admin/login`:

| Field | Selector | Notes |
|-------|----------|-------|
| Email | `input[type="email"]` (`.first()`) | placeholder `admin@example.com` |
| Password | `input[type="password"]` (`.first()`) | placeholder `••••••••` |
| Submit | `button[type="submit"]` (`.first()`) | |

Existing helper in `e2e/admin.spec.ts` already uses exactly these selectors via `loginAsAdmin(page)`.

> Caveat: the home page `/` also reports one `input[type="email"]` + one `button[type="submit"]` (a newsletter field), so scope email/password selectors to the login page context, not globally.

---

## 5. AUTHENTICATED ADMIN AUDIT: BLOCKED — needs credential values (not confirmed for production)

A **local test seed** credential exists in the repo (`e2e/admin.spec.ts`): `admin@fishweb.com` / `admin123`. This was **NOT used** against production because:

1. The mandate is strictly READ-ONLY; a login attempt is a session-creating action against live prod and could trip security lockout / audit-log noise.
2. These are default local-seed values with no evidence they are valid on production — guessing was explicitly out of scope.
3. `env` scan found **no** production admin credentials (`env | grep -iE 'admin|aquavo|password|secret'` returned nothing usable).

### What could NOT be verified (requires real production admin credentials, provided out-of-band):
- Admin dashboard `/admin` renders, loads data, and its widgets/tabs function
- Finance Center `/admin/finance` — finance snapshot, audit history, invariant checks display correctly
- Authenticated admin API responses (200 payloads, shapes, BigInt sanitization on live data)
- Orders / customers / coupons / reviews / gallery / settings admin CRUD screens
- Any PII-bearing screen (deliberately not accessed)

### Security recommendation (for whoever holds prod creds):
Verify the default seed credential `admin@fishweb.com` / `admin123` does **NOT** authenticate on production. If it does, that is a critical default-credential vulnerability. This check requires an authorized login attempt and was not performed here.

---

## 6. Artifacts (kept OUT of repo/git)

- Throwaway Playwright script + 2 PUBLIC-page screenshots (`shot-home.png`, `shot-admin-login.png`) live only in the OS scratch dir. No credentials, cookies, session state, or PII stored anywhere in the repo or Git.
