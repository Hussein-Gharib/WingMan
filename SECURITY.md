# WingMan — Security Notes

This document summarizes the production security controls and the manual
configuration you should apply in the Vercel dashboard.

## Controls implemented in code

- **Per-route admin authorization.** Every admin API route
  (`/api/admin/menu`, `/offers`, `/categories`, `/settings`, `/upload`) calls
  `requireAdmin()` as its first line and returns **401** when the signed session
  cookie is missing or invalid. This is enforced in the handler itself, not only
  in middleware (defense in depth).
- **CSRF protection.** `requireAdmin()` rejects `POST/PUT/PATCH/DELETE` whose
  `Origin` does not match the request `Host` (**403**). The login route applies
  the same same-origin check.
- **Login brute-force protection.** Per-IP limit of **5 failed attempts / 10
  minutes** (`lib/rateLimit.js`), an increasing backoff delay after each failure,
  a generic `Invalid credentials.` message, and **429** with `Retry-After` once
  the limit is hit. The password check is length-aware constant-time.
- **Session cookies.** `httpOnly`, `secure` in production, `sameSite=lax`,
  `path=/`, 7-day expiry, signed HS256 JWT, re-issued on each login, cleared on
  logout, and signature-verified on every protected request.
- **Server-side input validation (Zod).** All mutations validate against strict
  schemas (`lib/validation.js`): bounded name/description/URL lengths, positive
  USD/LBP prices, integer IDs, booleans, sort arrays, `https`/relative image URLs
  only, digit-only WhatsApp number, and **rejection of unexpected fields**.
- **Upload hardening.** JPEG/PNG/WebP only, verified by **magic bytes** (not the
  client MIME) plus extension consistency; **5 MB** cap returning **413**; random
  UUID filenames (no path traversal, no overwrite); admin-only.
- **Database.** All SQL is server-only and fully parameterized via the `neon`
  tagged-template client — no string concatenation. `DATABASE_URL` is never sent
  to the client, and the app fails closed in production if it is missing.
- **Secrets.** `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `ADMIN_PASSWORD`,
  `SESSION_SECRET` are server-only with **no `NEXT_PUBLIC_` prefix**. Error
  responses are generic; internal details are logged server-side only (never
  passwords, cookies, tokens, or connection strings).
- **Security headers** (`next.config.js`): `Content-Security-Policy`,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Permissions-Policy`, and `Strict-Transport-Security` (production).

## Manual configuration in Vercel (recommended)

The in-app login rate limiter is per-instance (Vercel runs multiple isolated
serverless instances), so also add an edge-level limit:

1. **Vercel Firewall → Rate Limiting** (Project → Settings → Firewall):
   - **Rule:** limit requests to path `/api/login`.
   - **Condition:** `Request Path` equals `/api/login` **and** `Request Method`
     equals `POST`.
   - **Limit:** e.g. **10 requests per 60 seconds per IP**.
   - **Action:** Deny / Challenge (429).
   - Optionally add a broader rule for `/api/admin/*` (e.g. 60 req/min per IP).
2. **Environment variables** (Project → Settings → Environment Variables):
   confirm `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `ADMIN_PASSWORD`, and a
   strong `SESSION_SECRET` (`openssl rand -base64 32`) are set for **Production**
   and none use the `NEXT_PUBLIC_` prefix.
3. **Enable HTTPS-only** (default on Vercel) so the `Secure` cookie flag and HSTS
   are effective.

## Dependency audit status

`npm audit` reports 11 advisories, all transitive and all fixable **only** via
breaking major upgrades, which were intentionally **not** auto-applied:

- **Next.js** (`14.2.35`, already the newest `14.2.x`): fix requires `next@16`
  (major). The flagged issues are SSRF-via-rewrites (this app defines **no**
  rewrites), unbounded Server Action payload (this app uses **route handlers, not
  Server Actions**), and cache/Server-Function disclosure — low reachability here.
- **undici / postcss** (via `@vercel/blob@0.27`): fix requires
  `@vercel/blob@2.6` (major). `undici` is used only for server-side HTTPS calls to
  the trusted Vercel Blob endpoint; the WebSocket/smuggling/Set-Cookie issues are
  not reachable in this usage. `postcss` is build-time only.

**Recommendation:** schedule a tested upgrade to `next@15/16` and
`@vercel/blob@2` in a branch (run `npm audit fix --force`, then re-run the build
and the security tests) rather than applying it blindly to production.
