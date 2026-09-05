# Artisan Exchange Backend

This app now uses Next.js route handlers plus Prisma 7 for a real backend foundation.

## Database

The Prisma schema is in `prisma/schema.prisma` and models:

- Users and roles: buyer, artist, admin
- Artist profiles and verification status
- Artwork listings and media
- Direct artwork orders
- Custom commission requests
- Meetings for commission discovery
- Messages tied to commission requests
- Transactions, payouts, and reviews

## Setup

1. Create a Postgres database.
2. Copy `.env.example` to `.env`.
3. Set `DATABASE_URL` and a long random `JWT_SECRET`.
4. Run:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

## API Routes

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/artworks`
- `POST /api/artworks`
- `GET /api/artworks/:slugOrId`
- `PATCH /api/artworks/:slugOrId` (owning artist)
- `DELETE /api/artworks/:slugOrId` (owning artist — archives, does not hard-delete)
- `GET /api/commissions` (own requests, buyer or artist)
- `POST /api/commissions`
- `GET /api/commissions/:id`
- `PATCH /api/commissions/:id` (owning artist — status/quote transitions)
- `POST /api/commissions/:id/messages`
- `POST /api/meetings`
- `GET /api/orders` (own orders, buyer or artist)
- `POST /api/orders`
- `GET /api/orders/:id`
- `PATCH /api/orders/:id` (owning artist — shipping status transitions)
- `POST /api/orders/:id/pay`
- `POST /api/uploads` (multipart file upload, used for artwork images and commission references)
- `GET /api/studio/summary`
- `PATCH /api/admin/artists/:id` (admin — commission rate override)
- `POST /api/admin/artists/:id/payout` (admin — settles outstanding artist balance)

## Integration Notes

Payments are modeled through `Order` and `Transaction`, created via the provider abstraction in `lib/payments.js` (see `README.md`). The current default provider (`manual`) settles immediately on checkout confirmation. Stripe can be added by implementing the `stripe` provider's `createIntent`/`confirmIntent` and setting `PAYMENT_PROVIDER=stripe` — no route or UI changes required.

File uploads go through the storage abstraction in `lib/storage.js` (see `README.md`), defaulting to local disk under `public/uploads/`.

Meetings are modeled through `Meeting`. The current provider label is `manual`; Google Meet, Zoom, or Calendar integration can be added behind the same route.
