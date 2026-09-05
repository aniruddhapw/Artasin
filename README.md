# Artisan Exchange

A minimalist, editorial-style art marketplace built with Next.js (App Router) and Prisma/PostgreSQL. Artists list original paintings, sculpture, digital art, and photography; collectors browse, purchase, and commission bespoke work; the platform takes a commission on every transaction.

## Stack

- Next.js 16 (App Router, React 19)
- PostgreSQL via Prisma 7 with the `@prisma/adapter-pg` driver adapter
- JWT sessions in an HttpOnly cookie (`jose`, `bcryptjs`)
- Zod request validation on every mutating API route
- Local disk file storage for uploads (swappable — see [Storage](#storage))

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
| `PLATFORM_COMMISSION_RATE` | Default commission percentage applied when an artist has no override (`ArtistProfile.commissionRate`). Admins can override per-artist from `/admin/artists`. |
| `PAYMENT_PROVIDER` | `manual` (default, instant mock settlement) or `stripe` (stubbed — see [Payments](#payments)). |
| `STORAGE_PROVIDER` | `local` (default — see [Storage](#storage)). |
| `MEETING_PROVIDER` | Label stored on scheduled meetings; swap for a real calendar/video integration later. |

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

`lib/storage.js` defines a provider interface (`save(file)` → URL) used by `POST /api/uploads` for both artwork images and commission reference files. The default `local` provider writes into `public/uploads/`. Swap in an S3-compatible provider by adding an entry to the `providers` map and setting `STORAGE_PROVIDER`.

### Commissions

`CommissionRequest` moves through `SUBMITTED → ARTIST_REVIEW → QUOTED → ACCEPTED → IN_PROGRESS → FINAL_REVIEW → COMPLETED` (or `REJECTED`/`CANCELLED`). Artists quote from `/studio/commissions/[id]`; buyers accept a quote from `/commissions/[id]`, which routes to `/checkout?commissionRequestId=...` and creates an `Order` tied back to the brief. Both sides can message (`Message`) and schedule meetings (`Meeting`) on the same thread.

## Scripts

```bash
npm run dev          # start the dev server
npm run build         # production build
npm run start          # run the production build
npm run db:generate   # regenerate the Prisma client
npm run db:migrate    # run Prisma migrations
npm run db:seed       # seed demo data
npm run db:studio     # open Prisma Studio
```

## Known Follow-ups

- Images render via plain `<img>` tags rather than `next/image`; swapping in `next/image` would add automatic resizing/optimization but requires reworking several CSS-driven aspect-ratio containers.
- The `stripe` payment provider and any real object-storage provider are stubbed but not implemented — see the sections above for the exact seam to fill in.
- There is no dedicated `Dispute` model; the admin dashboard counts orders in the `DISPUTED` `OrderStatus` as a proxy.
