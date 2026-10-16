/**
 * Environment variables the app reads, for autocompletion and so a typo in
 * a name stands out in review. All are optional strings: nothing validates
 * them when the app starts, so each reader handles a missing or odd value
 * itself (see BACKEND.md and README for what each one does).
 *
 * NODE_ENV is typed by Next.js and left alone here.
 */
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Core
      DATABASE_URL?: string;
      DIRECT_DATABASE_URL?: string;
      JWT_SECRET?: string;
      NEXT_PUBLIC_SITE_URL?: string;
      /** Set by Vercel: "production", "preview" or "development". */
      VERCEL_ENV?: string;
      CRON_SECRET?: string;
      ALLOW_PROD_SEED?: string;
      /** "true" lets a preview deploy (the dev site) run migrations. */
      MIGRATE_ON_DEPLOY?: string;
      ADMIN_NOTIFICATION_EMAIL?: string;

      // Sign-in
      GOOGLE_CLIENT_ID?: string;
      GOOGLE_CLIENT_SECRET?: string;

      // Email
      EMAIL_PROVIDER?: string;
      EMAIL_FROM?: string;
      RESEND_API_KEY?: string;
      RESEND_SEGMENT_ID?: string;
      RESEND_NEWSLETTER_TOPIC_ID?: string;

      // Uploads
      STORAGE_PROVIDER?: string;
      CLOUDINARY_CLOUD_NAME?: string;
      CLOUDINARY_API_KEY?: string;
      CLOUDINARY_API_SECRET?: string;

      // Payments
      PAYMENT_PROVIDER?: string;
      PLATFORM_COMMISSION_RATE?: string;
      RAZORPAY_KEY_ID?: string;
      RAZORPAY_KEY_SECRET?: string;
      RAZORPAY_WEBHOOK_SECRET?: string;
      STRIPE_PUBLISHABLE_KEY?: string;
      MEETING_PROVIDER?: string;

      // Push notifications
      VAPID_PUBLIC_KEY?: string;
      VAPID_PRIVATE_KEY?: string;
      VAPID_CONTACT_EMAIL?: string;
      NEXT_PUBLIC_VAPID_PUBLIC_KEY?: string;

      // WhatsApp phone verification
      WHATSAPP_BUSINESS_NUMBER?: string;
      WHATSAPP_APP_SECRET?: string;
      WHATSAPP_VERIFY_TOKEN?: string;
      WHATSAPP_ACCESS_TOKEN?: string;
      WHATSAPP_PHONE_NUMBER_ID?: string;
      WHATSAPP_GRAPH_VERSION?: string;
    }
  }
}

export {};
