# Artasin

A minimalist, editorial-style art marketplace built with Next.js (App Router) and Prisma/PostgreSQL. Artists list original paintings, sculpture, digital art, and photography, keep a portfolio, and write a blog; collectors browse, add to cart, purchase, and commission bespoke work; the platform takes a commission on every transaction.

## Stack

- Next.js 16 (App Router, React 19)
- PostgreSQL via Prisma 7 with the `@prisma/adapter-pg` driver adapter
- JWT sessions in an HttpOnly cookie (`jose`, `bcryptjs`)
- Zod request validation on every mutating API route
- Tiptap rich-text editing for artist blog posts, sanitized server-side with `sanitize-html`
- Browser push via `web-push`, transactional email via Resend
- English/Marathi UI from cookie-selected dictionaries (`lib/i18n`)
- Installable PWA (`app/manifest.js`, `public/sw.js`) with an offline fallback page
- File storage for uploads: local disk in development, Cloudinary in production (see [Storage](#storage))

## Getting Started

```bash
npm install
cp .env.example .env   # then fill in at least DATABASE_URL and JWT_SECRET
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

The app runs at `http://localhost:3000` by default (`npm run dev -- -p 3001` to use a different port).

> **Note:** `.env.example` is currently an empty placeholder — the [Environment Variables](#environment-variables) table below is the authoritative list of what the app reads. `DATABASE_URL` and `JWT_SECRET` are the only two required to boot; every integration (payments, storage, email, Google sign-in, push) falls back to a local-only default or switches itself off when its variables are absent.

> **Note:** `next.config.js` sets `allowedDevOrigins: ["127.0.0.1", "localhost"]`. Next's dev server treats `127.0.0.1` and `localhost` as different origins and otherwise silently refuses to serve client JS to whichever one isn't allowlisted — pages still return 200 and look fine in `curl`/view-source, but every client component fails to hydrate (forms silently fall back to native GET submission, buttons do nothing). If you add a different dev host, add it here too.

### Demo accounts

> **⚠️ Local development only.** These accounts — including an admin login —
> are created with a fixed, publicly-documented password. `npm run db:seed`
> refuses to run against a non-local `DATABASE_URL` for exactly this
> reason (see `prisma/seed.js`). If this was ever seeded into production
> before that guard existed, rotate `admin@example.com`'s password
> immediately via `/account` → Change Password.

Seeded by `npm run db:seed`, all with password `artisan-demo-password`:

| Role   | Email                       | Notes                                   |
| ------ | ---------------------------- | ---------------------------------------- |
| Buyer  | `collector@example.com`      | Has no orders yet — a clean start.       |
| Artist | `elena.rossi@example.com`    | Owns the seeded "Echoes of Silence" listing and one commission brief. |
| Admin  | `admin@example.com`          | Access to `/admin` for GMV, payouts, and commission-rate management. |

## Environment Variables

The table below is the full set of variables the app reads.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. **Required.** |
| `JWT_SECRET` | Long random string (24+ chars) used to sign session cookies. **Required** — `proxy.js` throws without it. |
| `NEXT_PUBLIC_SITE_URL` | Public base URL, used for SEO metadata (`metadataBase`, Open Graph), email links, and the Google OAuth redirect. Set to your real domain in production. |
| `PLATFORM_COMMISSION_RATE` | Default commission percentage applied when an artist has no override (`ArtistProfile.commissionRate`). Admins can override per-artist from `/admin/artists`. |
| `PAYMENT_PROVIDER` | `manual` (default, instant mock settlement — local only) or `razorpay` (real payments — see [Payments](#payments)). |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | Required when `PAYMENT_PROVIDER=razorpay`. Key id/secret from Razorpay → Settings → API Keys; webhook secret from the webhook you create there. |
| `STORAGE_PROVIDER` | `local` (default, disk-based — see [Storage](#storage)) or `cloudinary`. |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Required when `STORAGE_PROVIDER=cloudinary`. From your Cloudinary dashboard. |
| `MEETING_PROVIDER` | Label stored on scheduled meetings; swap for a real calendar/video integration later. |
| `EMAIL_PROVIDER` | `console` (default in local dev — logs the email instead of sending it) or `resend`. Auto-selects `resend` if `RESEND_API_KEY` is set — see [Notifications](#notifications). |
| `RESEND_API_KEY` | Required when `EMAIL_PROVIDER=resend`. From your Resend dashboard. |
| `EMAIL_FROM` | Sender shown on outgoing emails, e.g. `ARTASIN <notifications@yourdomain.com>`. Requires a verified sending domain in Resend. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Enables "Continue with Google" on `/login` and `/signup` when both are set — see [Auth](#auth). Omit either one and the button redirects to `/login?error=google_not_configured` instead of erroring. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Enable browser push notifications for commission messages (`VAPID_PUBLIC_KEY` and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` are the same value — one read server-side, one inlined client-side). Generate a pair with `npx web-push generate-vapid-keys`. Omit all three and the app just skips sending pushes. |
| `VAPID_CONTACT_EMAIL` | Contact address push services can reach you at, sent as the `mailto:` subject of every push. Defaults to `support@artasin.in`. |
| `CRON_SECRET` | Authenticates Vercel's daily cron invocation of `/api/cron/message-followups` (see [`vercel.json`](vercel.json)) — without it, the endpoint rejects every request, including Vercel's own. A random string of 16+ characters; Vercel sends it back as the `Authorization: Bearer` header automatically once it's set as an env var. |
| `ALLOW_PROD_SEED` | Escape hatch for `npm run db:seed`'s local-only guard. Leave unset unless you genuinely mean to seed demo accounts into a remote database. |

`STRIPE_PUBLISHABLE_KEY` is referenced by the unimplemented `stripe` payment provider only; setting it does nothing (see [Payments](#payments)).

## Architecture Notes

### Auth

- `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`.
- Sessions are a JWT in an HttpOnly, SameSite=Lax cookie (`lib/auth.js`).
- `proxy.js` (Next's middleware convention as of Next 16) gates `/studio`, `/admin`, `/orders`, `/commissions`, `/checkout`, and `/account` at the edge by verifying the JWT and role; individual API routes and server components re-check ownership against the database before returning data.
- **Password reset**: `POST /api/auth/forgot-password` always answers the same way whether or not the address exists, and mails a single-use token (`PasswordResetToken`) when it does; `POST /api/auth/reset-password` consumes it. `POST /api/auth/change-password` handles the signed-in case from `/account`.
- **Rate limiting**: signup, login, and forgot-password go through `lib/rateLimit.js`. It counts hits in a `RateLimitHit` table rather than process memory, because Vercel's serverless functions don't share memory across invocations — an in-process counter would only ever see a fraction of the traffic aimed at a route. Expired buckets are swept opportunistically on roughly 1 in 200 hits, so there's no cron job to configure.
- **Google Sign-In**: `GET /api/auth/google` redirects to Google's consent screen (with a random `state` value stashed in a short-lived HttpOnly cookie for CSRF protection); `GET /api/auth/google/callback` validates that state, exchanges the code, and either links the Google account to an existing user with the same (verified) email or creates a new `BUYER` account — it never creates an `ARTIST` account, since that needs a display name/slug Google doesn't provide. The resulting session is the same JWT cookie password login uses, so the rest of the app doesn't know or care which method a user signed in with. `User.passwordHash` is nullable to support Google-only accounts; `POST /api/auth/login` returns a distinct error message if you try to password-login into one. Requires a Google Cloud OAuth client with `${NEXT_PUBLIC_SITE_URL}/api/auth/google/callback` registered as an authorized redirect URI (both local and production URLs need their own entry).
- **Becoming an artist**: a signed-in buyer can upgrade in place via `POST /api/account/become-artist`, which creates the `ArtistProfile` (deriving a unique studio slug from the display name), flips the role to `ARTIST`, and re-issues the session cookie so the new role takes effect immediately. New artists start at `PENDING` verification and can't publish until an admin approves them from `/admin/artists`.

### Payments

`lib/payments.js` defines a small provider interface (`createIntent` / `confirmIntent` / `clientKey`) so the UI and API routes never hardcode payment behavior:

- `manual` (default): creates a mock payment intent and settles it immediately when the buyer confirms checkout. Good for demos and local development — **never use it in production**, since it marks orders paid without taking any money.
- `razorpay`: real payments. Requires `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`.
- `stripe`: intentionally not implemented — its methods throw. Stripe India has been invite-only for new Indian businesses since May 2024 and doesn't cover UPI, which is why this app uses Razorpay.

**How the Razorpay flow works.** `POST /api/orders` creates our `Order` plus a Razorpay order, and returns the Razorpay order id together with the *publishable* key id (the secret never leaves the server). The browser opens Razorpay's hosted modal — card and UPI details are entered inside Razorpay's iframe and never touch this app. On success the browser posts the signed result to `POST /api/orders/:id/pay`, which verifies the `<order_id>|<payment_id>` HMAC against the key secret and then re-checks the payment's status with Razorpay's API before marking the order paid. A failed verification marks the transaction `FAILED` and returns 402.

Because a buyer can close the tab between paying and being redirected, `POST /api/webhooks/razorpay` is the safety net: it verifies the webhook signature, then marks the order paid (and sends the confirmation emails) if the browser never got the chance to. It's idempotent — an order that isn't `PENDING_PAYMENT` is left alone.

Set the webhook up in the Razorpay dashboard pointing at `https://your-domain/api/webhooks/razorpay`, subscribed to `payment.captured` and `payment.failed`, using the same secret as `RAZORPAY_WEBHOOK_SECRET`.

Every order stores `platformCommissionCents` and `artistPayoutCents`, computed from `getPlatformCommissionRate()` (per-artist override, falling back to `PLATFORM_COMMISSION_RATE`). Admins settle artist balances from `/admin/artists`, which creates a `Payout` record for the outstanding amount.

### Cart and checkout

Every listing is a unique original, so a cart line is a `CartItem` pointing at one artwork with no quantity. `lib/cart.js` re-checks availability on every read and reports sold, unpublished, or archived pieces separately, so `/cart` can say what happened instead of silently dropping a row or quoting a price for something that's gone. `POST /api/orders/cart` turns the still-available items into orders; a single artwork can also be bought directly from `/artwork/[slug]` via `POST /api/orders`.

### Search

`components/NavSearch.jsx` puts a search box in the nav on every page; it pushes to `/gallery?q=…`, which matches against artwork title, description, and artist display name. The `/api/artworks` list endpoint takes the same `q` parameter.

### Storage

`lib/storage.js` defines a provider interface (`save(file)` → URL) used by `POST /api/uploads` for artwork images, portfolio media, blog images, and commission reference files.

- `local` (default): writes into `public/uploads/`. **Only works for local development** — most production hosts (including Vercel) run on an ephemeral, read-only filesystem, so files written here will not persist or may not be servable at all.
- `cloudinary`: uploads to Cloudinary and returns its `secure_url`. Requires `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. This is what production should use.

Add another provider (e.g. S3) by adding an entry to the `providers` map in `lib/storage.js`.

Uploads are stored untransformed, so `lib/images.js` rewrites Cloudinary URLs on the way out — inserting a transformation segment so grids get a small file while the zoom view keeps the original. Non-Cloudinary URLs (local `/uploads/` files, the bundled placeholder) pass through untouched. `components/LazyImage.jsx` defers off-screen images behind a shimmer placeholder and fades them in once decoded.

### Commissions

`CommissionRequest` moves through `SUBMITTED → ARTIST_REVIEW → QUOTED → ACCEPTED → IN_PROGRESS → FINAL_REVIEW → COMPLETED` (or `REJECTED`/`CANCELLED`); the transitions an artist may make are the `artistNextStatuses` map in `app/api/commissions/[id]/route.js`. `MEETING_REQUESTED` exists in the enum and counts as pending on the studio dashboard, but no route currently moves a request into it. Buyers file a brief from `/requests`; artists quote from `/studio/commissions/[id]`; buyers accept a quote from `/commissions/[id]`, which routes to `/checkout?commissionRequestId=...` and creates an `Order` tied back to the brief. Both sides can message (`Message`) and schedule meetings (`Meeting`) on the same thread.

A message that sits unanswered for six hours or more triggers exactly one follow-up email, sent by the daily cron at `/api/cron/message-followups` (scheduled in `vercel.json`, authenticated with `CRON_SECRET`). An active back-and-forth never emails at all, since each reply becomes the thread's newest message and resets the check; `Message.followupEmailSentAt` keeps a catch-up run from double-sending.

### Portfolio and blog

Beyond listings for sale, an artist keeps a portfolio (`PortfolioPiece`, up to 24 pieces, images or YouTube videos normalized to a bare video id by `lib/youtube.js`) and writes blog posts (`BlogPost`, `DRAFT` → `PUBLISHED`), both managed from `/studio`. Portfolio images can be uploaded several at a time. Publishing a post emails every other user once, at the moment it flips to `PUBLISHED` — not on later edits (`lib/blogNotifications.js`).

Blog bodies are real HTML from a Tiptap editor, which makes them the one place in the app where user content is rendered with `dangerouslySetInnerHTML`. `lib/sanitizeBlogHtml.js` runs a deliberately narrow allowlist — exactly the tags and attributes the editor's toolbar can produce — on write, so the database only ever holds clean HTML, and again on read as a backstop.

### Reviews

Once an `Order` reaches `DELIVERED` or `COMPLETED`, the buyer can leave a one-time 1-5 star rating and optional comment (`POST /api/orders/:id/review`), enforced by a unique constraint on `Review.orderId`. Average ratings and the review list surface on both the artwork page and the artist's profile page (`components/StarRating.jsx`).

### Admin

`/admin` is role-gated at the edge and re-checked in every route. It covers GMV and payout settlement (`/admin/artists`, including per-artist commission-rate overrides and artist verification decisions), artwork moderation and unpublishing (`/admin/artworks`), a read-only view of every commission request and its status (`/admin/commissions`), buyers (`/admin/buyers`), and disputes (`/admin/disputes`, resolved via `POST /api/admin/orders/:id/resolve`).

Admins also pin which artwork is the homepage hero (`POST /api/admin/hero`); clearing the pin falls back to the newest published listing. `POST /api/admin/phone-reminder` emails users who never added a phone number.

### Phone numbers

`lib/phone.js` normalizes typed numbers to E.164 (`+919876543210`) before storing them, assuming India when no country code is given. Numbers are stored normalized because WhatsApp and every SMS provider require E.164 — a number kept as "98765 43210" isn't messageable later without guessing. Users separately opt in to WhatsApp contact; unreadable input is rejected at validation time rather than stored unusable.

### Localization

`lib/i18n` holds English and Marathi dictionaries and reads the visitor's choice from a `locale` cookie set by `POST /api/locale`. A key missing from the chosen locale falls back to English, and a key missing everywhere renders as itself — a half-translated screen is recoverable, a screen of raw keys is not.

### Notifications

`lib/email.js` defines a provider interface (`send({ to, subject, html })`) and `lib/emails.js` holds the HTML templates, so routes never build email markup inline:

- `console` (default): logs the email to the server console instead of sending it. Used automatically in local dev when no `RESEND_API_KEY` is set.
- `resend`: sends via the [Resend](https://resend.com) API. Requires `RESEND_API_KEY` and a domain verified in Resend (set `EMAIL_FROM` to an address on that domain).

`sendEmail()` swallows and logs failures rather than throwing, so a broken email provider never blocks the underlying order/commission action. Current triggers: order paid (buyer + artist), order shipped/delivered (buyer), order refunded (buyer), dispute filed (all admins), new commission request (artist), commission quoted/rejected (buyer), unanswered commission message (the other party, via cron), new blog post (everyone but the author), password reset, admin-triggered missing-phone reminder, and artist verification approved/rejected. (`artistUploadReminderEmail` in `lib/emails.js` is written but not wired to anything yet.) Add another trigger by importing `sendEmail` and a template function from `lib/emails.js` at the point the underlying state changes.

Browser push runs alongside email for commission messages: `POST /api/push/subscribe` stores a `PushSubscription` and `lib/push.js` sends through `web-push`. Like email it's fire-and-forget — a push failure never fails the message send — and the whole thing no-ops when the VAPID keys are absent. Expired subscriptions are pruned when the push service rejects them.

### Security headers

`next.config.js` sets a Content-Security-Policy plus `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` on every response. The CSP explicitly allows Razorpay's checkout script and iframe and Google Fonts; `'unsafe-inline'` remains in `script-src`/`style-src` for the app's one inline script and Next's injected styles. If you add a third-party script, widget, or font host, it needs an entry here or the browser will block it.

## Scripts

```bash
npm run dev                 # start the dev server
npm run build               # production build
npm run start               # run the production build
npm test                    # Node's built-in test runner (no test files exist yet)
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
   Don't run `npm run db:seed` against production — it creates a demo admin account with a password published in this README (see the warning above). It refuses to run unless `DATABASE_URL` looks local, or `ALLOW_PROD_SEED=true` is explicitly set.
4. **Create a Cloudinary account** (free tier is fine) and grab the cloud name, API key, and API secret from its dashboard.
5. **Import the repo into Vercel** (vercel.com → New Project → your GitHub repo). Vercel auto-detects Next.js; no custom build command is needed.
6. **Set environment variables** in the Vercel project settings — everything from the [Environment Variables](#environment-variables) table, with production values:
   - `DATABASE_URL` — the production connection string from step 2
   - `JWT_SECRET` — a new, long, random value (**do not reuse the local dev secret**)
   - `NEXT_PUBLIC_SITE_URL` — your production domain, e.g. `https://your-app.vercel.app`
   - `PAYMENT_PROVIDER=razorpay` plus `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` — see [Payments](#payments)
   - `STORAGE_PROVIDER=cloudinary` plus the three `CLOUDINARY_*` values from step 4
   - `EMAIL_PROVIDER=resend` plus `RESEND_API_KEY` and `EMAIL_FROM` — see [Notifications](#notifications)
   - `CRON_SECRET` — required, or the daily follow-up cron rejects Vercel's own request
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (optional) — see [Auth](#auth)
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (optional) — browser push
   - `PLATFORM_COMMISSION_RATE`, `MEETING_PROVIDER` — same as local, or your production defaults
   - `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` — Playwright is a dev-only tool used for local screenshot QA; without this its `npm install` step tries to download a ~150MB Chromium binary during every Vercel build for no reason.
7. **Deploy.** Vercel builds and deploys automatically; every future push to `main` redeploys.
8. **Verify**: sign up a real account, confirm login/logout, publish an artwork (as an admin-approved artist — approve yourself from `/admin/artists` first), run through checkout, and upload an image to confirm Cloudinary is wired correctly.

## Known Follow-ups

- `.env.example` is empty; it should list the variables above so `cp .env.example .env` gives you a real starting point.
- There are no automated tests. `npm test` is wired to Node's test runner and waiting for its first file.
- Images render via plain `<img>` tags (through `components/LazyImage.jsx`) rather than `next/image`; swapping in `next/image` would add automatic resizing/optimization but requires reworking several CSS-driven aspect-ratio containers.
- Artist payouts are still recorded manually by an admin (`Payout` model) rather than settled automatically. Razorpay Route can split a payment between the platform and the artist at capture time; that's the upgrade path once volume justifies applying for it.
- There is no dedicated `Dispute` model; disputes reuse the `DISPUTED`/`REFUNDED` `OrderStatus` values (see `/admin/disputes` and `POST /api/orders/:id/dispute`), which is enough for a single order-level dispute but has no room for a reason, evidence, or a history of multiple back-and-forth resolutions.
- Email notifications don't cover meeting scheduling or payouts.
- No wishlist/saved-items.
- `BACKEND.md`'s API route list predates the cart, blog, portfolio, push, locale, and password-reset endpoints.
