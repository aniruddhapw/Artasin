# Artisan Exchange

A minimalist, editorial-style art marketplace built with Next.js (App Router) and Prisma/PostgreSQL. Artists list original paintings, sculpture, digital art, and photography; collectors browse, purchase, and commission bespoke work; the platform takes a commission on every transaction.

## Stack

- Next.js 16 (App Router, React 19)
- PostgreSQL via Prisma 7 with the `@prisma/adapter-pg` driver adapter
- JWT sessions in an HttpOnly cookie (`jose`, `bcryptjs`)
- Zod request validation on every mutating API route
- File storage for uploads: local disk in development, Cloudinary in production (see [Storage](#storage))

## Getting Started

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL and JWT_SECRET
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

The app runs at `http://localhost:3000` by default (`npm run dev -- -p 3001` to use a different port).

> **Note:** `next.config.js` sets `allowedDevOrigins: ["127.0.0.1", "localhost"]`. Next's dev server treats `127.0.0.1` and `localhost` as different origins and otherwise silently refuses to serve client JS to whichever one isn't allowlisted — pages still return 200 and look fine in `curl`/view-source, but every client component fails to hydrate (forms silently fall back to native GET submission, buttons do nothing). If you add a different dev host, add it here too.

### Demo accounts

Seeded by `npm run db:seed`, all with password `artisan-demo-password`:

| Role   | Email                       | Notes                                   |
| ------ | ---------------------------- | ---------------------------------------- |
| Buyer  | `collector@example.com`      | Has no orders yet — a clean start.       |
| Artist | `elena.rossi@example.com`    | Owns the seeded "Echoes of Silence" listing and one commission brief. |
| Admin  | `admin@example.com`          | Access to `/admin` for GMV, payouts, and commission-rate management. |

## Environment Variables

See `.env.example` for the full list. Key ones:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. |
| `JWT_SECRET` | Long random string (24+ chars) used to sign session cookies. |
| `NEXT_PUBLIC_SITE_URL` | Public base URL, used for SEO metadata (`metadataBase`, Open Graph). Set to your real domain in production. |
| `PLATFORM_COMMISSION_RATE` | Default commission percentage applied when an artist has no override (`ArtistProfile.commissionRate`). Admins can override per-artist from `/admin/artists`. |
| `PAYMENT_PROVIDER` | `manual` (default, instant mock settlement) or `stripe` (stubbed — see [Payments](#payments)). |
| `STORAGE_PROVIDER` | `local` (default, disk-based — see [Storage](#storage)) or `cloudinary`. |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Required when `STORAGE_PROVIDER=cloudinary`. From your Cloudinary dashboard. |
| `MEETING_PROVIDER` | Label stored on scheduled meetings; swap for a real calendar/video integration later. |
| `EMAIL_PROVIDER` | `console` (default in local dev — logs the email instead of sending it) or `resend`. Auto-selects `resend` if `RESEND_API_KEY` is set — see [Notifications](#notifications). |
| `RESEND_API_KEY` | Required when `EMAIL_PROVIDER=resend`. From your Resend dashboard. |
| `EMAIL_FROM` | Sender shown on outgoing emails, e.g. `ARTISAN <notifications@yourdomain.com>`. Requires a verified sending domain in Resend. |

## Architecture Notes

### Auth

- `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`.
- Sessions are a JWT in an HttpOnly, SameSite=Lax cookie (`lib/auth.js`).
- `proxy.js` (Next's middleware convention as of Next 16) gates `/studio`, `/admin`, `/orders`, `/commissions`, and `/checkout` at the edge by verifying the JWT and role; individual API routes and server components re-check ownership against the database before returning data.

### Payments

`lib/payments.js` defines a small provider interface (`createIntent` / `confirmIntent`) so the UI and API routes never hardcode payment behavior:

- `manual` (default): creates a mock payment intent and settles it immediately when the buyer confirms checkout. Good for demos and local development.
- `stripe`: stubbed to throw until `STRIPE_SECRET_KEY` is set and the real Payment Intents calls are wired in. No UI or route changes are needed to switch — only `PAYMENT_PROVIDER=stripe` and the implementation inside `lib/payments.js`.

Every order stores `platformCommissionCents` and `artistPayoutCents`, computed from `getPlatformCommissionRate()` (per-artist override, falling back to `PLATFORM_COMMISSION_RATE`). Admins settle artist balances from `/admin/artists`, which creates a `Payout` record for the outstanding amount.

### Storage

`lib/storage.js` defines a provider interface (`save(file)` → URL) used by `POST /api/uploads` for both artwork images and commission reference files.

- `local` (default): writes into `public/uploads/`. **Only works for local development** — most production hosts (including Vercel) run on an ephemeral, read-only filesystem, so files written here will not persist or may not be servable at all.
- `cloudinary`: uploads to Cloudinary and returns its `secure_url`. Requires `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. This is what production should use.

Add another provider (e.g. S3) by adding an entry to the `providers` map in `lib/storage.js`.

### Commissions

`CommissionRequest` moves through `SUBMITTED → ARTIST_REVIEW → QUOTED → ACCEPTED → IN_PROGRESS → FINAL_REVIEW → COMPLETED` (or `REJECTED`/`CANCELLED`). Artists quote from `/studio/commissions/[id]`; buyers accept a quote from `/commissions/[id]`, which routes to `/checkout?commissionRequestId=...` and creates an `Order` tied back to the brief. Both sides can message (`Message`) and schedule meetings (`Meeting`) on the same thread.

### Reviews

Once an `Order` reaches `DELIVERED` or `COMPLETED`, the buyer can leave a one-time 1-5 star rating and optional comment (`POST /api/orders/:id/review`), enforced by a unique constraint on `Review.orderId`. Average ratings and the review list surface on both the artwork page and the artist's profile page (`components/StarRating.jsx`).

### Notifications

`lib/email.js` defines a provider interface (`send({ to, subject, html })`) and `lib/emails.js` holds the HTML templates, so routes never build email markup inline:

- `console` (default): logs the email to the server console instead of sending it. Used automatically in local dev when no `RESEND_API_KEY` is set.
- `resend`: sends via the [Resend](https://resend.com) API. Requires `RESEND_API_KEY` and a domain verified in Resend (set `EMAIL_FROM` to an address on that domain).

`sendEmail()` swallows and logs failures rather than throwing, so a broken email provider never blocks the underlying order/commission action. Current triggers: order paid (buyer + artist), order shipped/delivered (buyer), order refunded (buyer), dispute filed (all admins), new commission request (artist), commission quoted/rejected (buyer), artist verification approved/rejected (artist). Add another trigger by importing `sendEmail` and a template function from `lib/emails.js` at the point the underlying state changes.

## Scripts

```bash
npm run dev                # start the dev server
npm run build               # production build
npm run start                 # run the production build
npm run db:generate         # regenerate the Prisma client
npm run db:migrate          # create/run a migration (local dev)
npm run db:migrate:deploy   # apply existing migrations without prompting (production)
npm run db:seed             # seed demo data
npm run db:studio           # open Prisma Studio
```

## Deploying to Production

This targets **Vercel** (frontend + API routes) and a managed **Postgres** host (Neon or Supabase both work well with Prisma's connection pooling). The design assumes you have accounts on GitHub, Vercel, your Postgres host, and Cloudinary (or another storage provider) — this repo can't create those for you.

1. **Push to GitHub.** Create an empty repo on github.com, then from this folder:
   ```bash
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. **Create a production database** on Neon/Supabase and copy its connection string.
3. **Apply migrations to it** (from your machine, pointed at the production `DATABASE_URL`):
   ```bash
   DATABASE_URL="<production-url>" npm run db:migrate:deploy
   ```
   Only run `npm run db:seed` against production if you actually want the demo accounts/data there — it's meant for local development.
4. **Create a Cloudinary account** (free tier is fine) and grab the cloud name, API key, and API secret from its dashboard.
5. **Import the repo into Vercel** (vercel.com → New Project → your GitHub repo). Vercel auto-detects Next.js; no custom build command is needed.
6. **Set environment variables** in the Vercel project settings — everything in `.env.example`, with production values:
   - `DATABASE_URL` — the production connection string from step 2
   - `JWT_SECRET` — a new, long, random value (**do not reuse the local dev secret**)
   - `NEXT_PUBLIC_SITE_URL` — your production domain, e.g. `https://your-app.vercel.app`
   - `PAYMENT_PROVIDER=manual` (until Stripe is wired in — see [Payments](#payments))
   - `STORAGE_PROVIDER=cloudinary` plus the three `CLOUDINARY_*` values from step 4
   - `EMAIL_PROVIDER=resend` plus `RESEND_API_KEY` and `EMAIL_FROM` — see [Notifications](#notifications)
   - `PLATFORM_COMMISSION_RATE`, `MEETING_PROVIDER` — same as local, or your production defaults
   - `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` — Playwright is a dev-only tool used for local screenshot QA; without this its `npm install` step tries to download a ~150MB Chromium binary during every Vercel build for no reason.
7. **Deploy.** Vercel builds and deploys automatically; every future push to `main` redeploys.
8. **Verify**: sign up a real account, confirm login/logout, publish an artwork (as an admin-approved artist — approve yourself from `/admin/artists` first), run through checkout, and upload an image to confirm Cloudinary is wired correctly.

## Known Follow-ups

- Images render via plain `<img>` tags rather than `next/image`; swapping in `next/image` would add automatic resizing/optimization but requires reworking several CSS-driven aspect-ratio containers.
- The `stripe` payment provider is stubbed but not implemented — see [Payments](#payments) for the exact seam to fill in.
- There is no dedicated `Dispute` model; disputes reuse the `DISPUTED`/`REFUNDED` `OrderStatus` values (see `/admin/disputes` and `POST /api/orders/:id/dispute`), which is enough for a single order-level dispute but has no room for a reason, evidence, or a history of multiple back-and-forth resolutions.
- Email notifications cover order/commission/verification events (see [Notifications](#notifications)) but not meeting scheduling or payouts.
- No wishlist/saved-items, and no search box on `/gallery` (the API supports a `q` param already).
