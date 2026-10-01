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

### Phone verification over WhatsApp

People prove their phone number is theirs by sending a code *to* Artasin on WhatsApp (`lib/whatsapp.js`, `lib/phoneVerification.js`). Receiving messages, and replying within 24 hours, is free on Meta's WhatsApp Cloud API, so verifications cost nothing; an SMS code would cost money on every send.

It's switched off until `WHATSAPP_BUSINESS_NUMBER` is set. While off, the verify page, the account-page button and the studio banner all stay hidden.

| Variable | What it is |
| --- | --- |
| `WHATSAPP_BUSINESS_NUMBER` | Artasin's WhatsApp number with country code, e.g. `919876543210`. Turns the feature on. |
| `WHATSAPP_APP_SECRET` | Meta app → App settings → Basic → App secret. Used to check each webhook really came from Meta. |
| `WHATSAPP_VERIFY_TOKEN` | Any long random string you choose; entered again in the webhook settings below. |
| `WHATSAPP_ACCESS_TOKEN` | A permanent System User token with `whatsapp_business_messaging`. Only for the confirmation reply; verification works without it. |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp → API Setup → Phone number ID. Also only for the reply. |

One-time setup:

1. At developers.facebook.com, create an app of type **Business** and add the **WhatsApp** product.
2. Under WhatsApp → API Setup, add Artasin's number. It must not be registered on the regular WhatsApp or WhatsApp Business app; a spare SIM works. Verify it by SMS or call.
3. Under WhatsApp → Configuration → Webhook, set the callback URL to `https://artasin.in/api/whatsapp/webhook` and the verify token to `WHATSAPP_VERIFY_TOKEN`, then subscribe to the **messages** field.
4. Create a System User in Business Settings, give it the app and the WhatsApp account, and generate a permanent token with `whatsapp_business_messaging`.
5. Add the variables above in Vercel (Production) and redeploy.
6. Check: sign in, go to Account, tap **Verify on WhatsApp** and send the message. The page should confirm within a few seconds.
