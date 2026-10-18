import type { NextConfig } from "next";

// Razorpay's checkout is loaded as a same-page <script src> (see
// components/checkout/CheckoutForm.tsx) and opens its own hosted iframe, so
// both need an explicit CSP allowance rather than the default same-origin-only
// policy. 'unsafe-inline' stays in script/style-src because the app has a
// small inline <script> in app/layout.tsx and relies on Next's own injected
// styles — a nonce-based CSP would be stricter but is a bigger, riskier
// change than what was asked for here. fonts.googleapis.com/fonts.gstatic.com
// are allowlisted for the Google Fonts @import in app/globals.css.
// www.youtube-nocookie.com is the host of the portfolio video player
// (lib/youtube.ts youtubeEmbedUrl); without it every video opens to a black box.
//
// The 3D gallery's models (components/gallery3d/staff.ts and crowd.ts) need
// two more things: 'wasm-unsafe-eval' lets the meshopt decoder compile its
// WebAssembly (it allows WebAssembly, not JavaScript eval), and blob: in
// connect-src lets GLTFLoader read the textures it unpacks from a model file
// into blob: URLs of its own. They apply to every page, not just
// /gallery/walk: a page's CSP is the one the document was loaded with, so
// arriving at the gallery by an in-app link (from the home page, say) kept
// the previous page's policy and the models silently failed to load.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://checkout.razorpay.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' blob: https://api.razorpay.com https://lumberjack.razorpay.com",
  "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://www.youtube-nocookie.com",
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

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The app is conventionally accessed at 127.0.0.1:3001 (see BACKEND.md/README),
  // which Next's dev server otherwise treats as a different origin than "localhost"
  // and silently refuses to serve JS assets to — breaking all client interactivity
  // (forms, buttons) with no console error. This allowlists that origin explicitly.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // www.artasin.in served the whole site as a second copy; one host keeps
  // search engines from splitting the site's links between two addresses.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.artasin.in" }],
        destination: "https://artasin.in/:path*",
        permanent: true
      }
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  }
};

export default nextConfig;
