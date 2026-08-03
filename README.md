# WingMan

A modern, mobile-first, premium website for **WingMan** — premium chicken wings and
boneless thighs. Customers browse the menu and offers and contact WingMan directly
via **WhatsApp** or phone. There is **no cart, checkout, payment, or customer
account** — just browsing and one-tap contact.

Built with **Next.js (App Router, JavaScript)**, **Neon PostgreSQL**, and
**Vercel Blob** for admin-uploaded images. A password-protected admin dashboard
manages categories, the menu (with dual USD + L.L pricing), offers, and contact
settings.

### Highlights
- Dark, luxury, animated public site with a striking hero, scroll reveals, and
  polished cards — designed mobile-first.
- Menu grouped into **categories** with a sticky category filter/navigation.
- **Dual-currency pricing** (USD and L.L) — either or both, always laid out cleanly.
- Richer **offers** with a name, image, and optional dual pricing in an editorial layout.
- Fixed WhatsApp button + one-tap phone, Instagram, hours and delivery areas.

---

## Tech stack

| Concern            | Technology                                   |
| ------------------ | -------------------------------------------- |
| Framework          | Next.js 14 (App Router, JavaScript)          |
| Database           | Neon PostgreSQL (`@neondatabase/serverless`) |
| Image uploads      | Vercel Blob (`@vercel/blob`)                 |
| Admin auth         | Single password + signed HTTP-only cookie (`jose`) |
| Local static images| `/public/images` (kept as-is, never uploaded)|

---

## Project structure

```
app/
  layout.jsx              Root layout + metadata
  globals.css             Public site styles
  page.jsx                Public home (menu, offers, contact, WhatsApp)
  components/             Icons + fixed WhatsApp button
  admin/
    admin.css             Admin styles
    layout.jsx            Admin shell (noindex)
    page.jsx              Login page
    dashboard/
      page.jsx            Server page (loads data, protected)
      DashboardClient.jsx Interactive dashboard (menu/offers/settings)
  api/
    login/ logout/        Session cookie set/clear
    admin/
      menu/ offers/ settings/ upload/   Protected mutations + Blob upload
lib/
  db.js                   Neon client (server-only)
  queries.js              Parameterized SQL (reads + mutations)
  auth.js                 Cookie signing/verification (edge-safe)
  blob.js                 Vercel Blob upload/delete + validation
  whatsapp.js             wa.me URL builder
  defaultData.js          Canonical menu + offline fallback
database/
  schema.sql              Neon schema
  seed.mjs                Seeds current WingMan menu
middleware.js             Server-side protection for /admin/dashboard + /api/admin/*
```

---

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable                | Purpose                                                        |
| ----------------------- | ------------------------------------------------------------- |
| `DATABASE_URL`          | Neon pooled connection string (server-only, never exposed).   |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token (admin uploads only).            |
| `ADMIN_PASSWORD`        | The single password for `/admin`.                             |
| `SESSION_SECRET`        | Long random string used to sign the session cookie.          |

Generate a strong `SESSION_SECRET` with:

```bash
openssl rand -base64 32
```

> **Local database — zero setup.** When `DATABASE_URL` is not set, the app runs
> an in-process PostgreSQL (PGlite) automatically, persisted to `.wingman-local-db`
> and seeded with the WingMan menu. This means the **entire site — including all
> admin writes (menu, categories, offers, settings)** — works locally with no
> Neon account. In production, set `DATABASE_URL` and Neon is used instead; PGlite
> is never bundled. Delete the `.wingman-local-db` folder to reset local data.
>
> Image **uploads** still require a Vercel Blob token (`BLOB_READ_WRITE_TOKEN`).
> The database layer uses a single tagged-template `sql` client (lib/db.js) for
> both backends, so queries are identical in dev and production.

---

## Local development

```bash
npm install
cp .env.example .env      # then edit .env
npm run dev               # http://localhost:3000
```

- Public site: `/`
- Admin login: `/admin`

## Test on your phone (same Wi-Fi)

```bash
npm run dev:lan           # binds to 0.0.0.0 so other devices can reach it
```

Then on your phone's browser open `http://<YOUR-COMPUTER-IP>:3000`.
Find your computer's IPv4 with `ipconfig` (Windows) — look for the LAN address
(e.g. `192.168.x.x`). Phone and computer must be on the **same network**. If it
doesn't load, allow Node.js through the Windows Firewall (Private networks) when
prompted, or temporarily allow inbound TCP port 3000.

---

## Database setup (Neon)

1. Create a project at https://neon.tech and open your database.
2. In the Neon **SQL Editor**, paste and run the contents of `database/schema.sql`.
3. Copy the **pooled** connection string into `DATABASE_URL` in `.env`.
4. Seed the current WingMan menu:
   ```bash
   npm run seed
   ```
   Re-running `npm run seed` resets the menu and offers to the canonical data;
   it does not overwrite settings you edit in the dashboard.

---

## Image handling

- The existing WingMan photos live in `/public/images` and are served directly.
  They are **never** deleted or modified by the app.
- New images uploaded from the admin dashboard go to **Vercel Blob**. Their URLs
  are stored in Neon.
- Uploads are validated (JPEG/PNG/WEBP/GIF, max 5 MB). When an image is replaced
  or its row deleted, the old **Blob** image is removed automatically.

---

## Admin dashboard (`/admin`)

Log in with `ADMIN_PASSWORD`. Capabilities:

- **Categories:** create / rename / delete / reorder. Deleting a category leaves
  its items intact as "Uncategorized" (no data loss).
- **Menu:** add / edit / delete / reorder items; upload or replace images; assign
  a category dynamically; set **USD and/or L.L** price; mark available/unavailable.
- **Offers:** add / edit / replace image / reorder / show-hide / delete, each with
  an **offer name**, image, and optional **USD + L.L** prices.
- **Settings:** WhatsApp number + default message, phone, Instagram, working
  hours, delivery areas.

Protection is enforced **server-side** by `middleware.js` for both the dashboard
and every `/api/admin/*` route — hiding the link is not relied upon.

---

## Deploy to Vercel

1. Push this project to a Git repository and **Import** it in Vercel.
2. Create storage from the Vercel dashboard:
   - **Storage → Create → Postgres (Neon)** — or connect your existing Neon
     project — and run `database/schema.sql` in Neon once.
   - **Storage → Create → Blob** to get a Blob store.
3. In **Project → Settings → Environment Variables**, add all four variables
   (`DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `ADMIN_PASSWORD`, `SESSION_SECRET`)
   for the Production (and Preview) environments.
4. Deploy. After the first deploy, run the seed once (locally with the
   production `DATABASE_URL`, or via the Neon SQL editor using the inserts).
5. Visit `/admin`, log in, and set the WhatsApp number, message, and contact
   details.

---

## Scripts

| Command          | Description                          |
| ---------------- | ------------------------------------ |
| `npm run dev`    | Start the dev server.                |
| `npm run build`  | Production build.                    |
| `npm run start`  | Run the production build.            |
| `npm run lint`   | Lint with `eslint-config-next`.      |
| `npm run seed`   | Seed Neon with the WingMan menu.     |
