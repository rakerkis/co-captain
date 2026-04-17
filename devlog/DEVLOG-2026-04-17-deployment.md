# Co-Captain Deployment Log — Vercel, Supabase, Google & Outlook OAuth Configuration

## Overview

Documents the first production web deployment of co-captain to Vercel, and the OAuth redirect configuration needed across Supabase, Google Cloud Console, and Azure (Microsoft Entra) so that sign-in flows work on both `localhost` and `https://co-captain.vercel.app`.

---

## 1. Vercel Deployment

**Host:** Vercel (free tier)
**URL:** `https://co-captain.vercel.app`
**Stack:** Vite + React (static) + Supabase (managed backend)

### Setup steps

1. Pushed `main` branch to GitHub.
2. At [vercel.com](https://vercel.com), imported the `co-captain` repo.
3. Vercel auto-detected Vite — no `vercel.json` needed.
4. Added environment variables in **Project Settings → Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - (plus any other `VITE_*` values from local `.env`)
5. Deployed.

### Preview deployments

Every PR / non-main branch gets its own URL of the form:
```
https://co-captain-<branch>-<user>.vercel.app
```

These are covered by a wildcard entry in the Supabase redirect allow-list (below).

---

## 2. Supabase — Auth URL Configuration

**Dashboard path:** Authentication → URL Configuration

### Site URL (single-value, fallback + email templates)

```
https://co-captain.vercel.app
```

> **Important:** Site URL is baked into every email Supabase sends (confirmations, password resets, magic links). Keeping it as `http://localhost:3000` would break email links for any real user signing up on production.

### Redirect URLs (allow-list, multi-value)

```
http://localhost:3000/**
https://co-captain.vercel.app/**
https://co-captain-*.vercel.app/**
co-captain://
```

Rationale:
- `localhost:3000/**` — local dev.
- `co-captain.vercel.app/**` — production web.
- `co-captain-*.vercel.app/**` — Vercel preview deploys for PR branches.
- `co-captain://` — Capacitor iOS/Android deep-link scheme.

The app code passes `redirectTo: window.location.origin` (web) or `redirectTo: 'co-captain://'` (native), so the outgoing redirect target is always one of the above — Supabase honors it because it's in the allow-list.

---

## 3. Google Cloud Console — OAuth 2.0 Client

**Path:** APIs & Services → Credentials → (OAuth 2.0 Client ID)

Because the app calls `supabase.auth.signInWithOAuth({ provider: 'google' })`, Google redirects back to **Supabase**, not directly to the app. Supabase then redirects back to the app.

### Authorized JavaScript origins

```
https://<supabase-project-ref>.supabase.co
https://co-captain.vercel.app
http://localhost:3000
```

### Authorized redirect URIs

```
https://<supabase-project-ref>.supabase.co/auth/v1/callback
```

> ⚠️ Do **not** add the Vercel URL as an Authorized redirect URI for Google — Supabase is the only endpoint Google talks to directly.

---

## 4. Azure Portal (Microsoft Entra) — Outlook OAuth

**Path:** App registrations → (co-captain app) → Authentication

Unlike Google, Outlook OAuth in this app goes **directly** from the browser to Microsoft — not via Supabase. The code (`src/integrations/outlookCalendar.ts`) uses `window.location.origin` as `redirect_uri`, so Azure must allow the Vercel origin explicitly.

> **Full details of the initial Azure app registration, PKCE flow, client ID, and scopes** are documented in [DEVLOG-2026-04-12 → Azure App Registration](DEVLOG-2026-04-12.md#azure-app-registration). The section below only covers what changed for the Vercel production deployment.

### Platform: Single-page application (NOT Web) ⚠️

The redirect URI **must** be registered under the **Single-page application** platform. Registering under **Web** will fail with:

```
invalid_request: The provided value for the input parameter 'redirect_uri'
is not valid. The expected value is a URI which matches a redirect URI
registered for this client application.
```

This is because the app uses **PKCE** (`code_challenge_method: S256`). Azure rejects PKCE flow on the Web platform even when the URI string matches exactly.

**Fix (if you hit this error):**
1. Azure Portal → App registration → **Authentication** → scroll to the platforms list.
2. If `https://co-captain.vercel.app` is listed under **Web** → delete it from Web.
3. Click **Add a platform** → choose **Single-page application** → add `https://co-captain.vercel.app`.

### Redirect URIs (under Single-page application)

```
http://localhost:3000
https://co-captain.vercel.app
```

(Add any Vercel preview URLs as needed if beta testers use them.)

**No trailing slash** — Azure treats `https://co-captain.vercel.app` and `https://co-captain.vercel.app/` as different URIs. The app sends `window.location.origin`, which never has a trailing slash.

### Implicit grant

Leave both **Access tokens** and **ID tokens** unchecked — the app uses PKCE flow.

---

## 5. Canvas

No OAuth redirect configuration required. Users paste a personal access token directly into Settings → Canvas. No provider-side setup needed.

---

## Verification checklist

Test in incognito on `https://co-captain.vercel.app`:

- [ ] Email + password signup → confirmation email link opens the Vercel URL (not localhost).
- [ ] Google sign-in → returns to the Vercel URL signed in (does not land on localhost).
- [ ] Settings → Connect Outlook → completes auth and syncs events.
- [ ] Settings → Canvas → paste token → assignments load.
- [ ] `localhost:3000` dev environment still works for all of the above.

### Most common failure modes

- **Google redirects back to localhost after login in production** → Supabase **Site URL** is still set to localhost. Change it to the Vercel URL.
- **"redirect_uri_mismatch" from Microsoft** → Most likely: the URI is registered under the **Web** platform instead of **Single-page application**. PKCE flow requires SPA platform. Also check for trailing-slash mismatch.
- **Email confirmation links broken for real users** → same as #1 — Site URL drives email templates.
- **Preview deploys fail auth** → Missing `https://co-captain-*.vercel.app/**` wildcard in Supabase redirect allow-list.

---

## Files / env touched

- **GitHub:** `main` branch connected as Vercel production source.
- **Vercel env vars:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- **Supabase:** URL Configuration (Site URL, Redirect URLs).
- **Google Cloud:** OAuth 2.0 Client → Authorized JavaScript origins (added Vercel domain).
- **Azure:** App registration → Authentication → Redirect URIs (added Vercel domain).

No source code changes — the app already uses `window.location.origin` for redirects, so it "just works" on any allow-listed origin.
