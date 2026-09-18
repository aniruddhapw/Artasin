// Razorpay's checkout is loaded as a same-page <script src> (see
// components/checkout/CheckoutForm.jsx) and opens its own hosted iframe, so
// both need an explicit CSP allowance rather than the default same-origin-only
// policy. 'unsafe-inline' stays in script/style-src because the app has a
// small inline <script> in app/layout.js and relies on Next's own injected
// styles — a nonce-based CSP would be stricter but is a bigger, riskier
// change than what was asked for here.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com",
  "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The app is conventionally accessed at 127.0.0.1:3001 (see BACKEND.md/README),
  // which Next's dev server otherwise treats as a different origin than "localhost"
  // and silently refuses to serve JS assets to — breaking all client interactivity
  // (forms, buttons) with no console error. This allowlists that origin explicitly.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  }
};

export default nextConfig;
