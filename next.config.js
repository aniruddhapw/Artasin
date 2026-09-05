/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The app is conventionally accessed at 127.0.0.1:3001 (see BACKEND.md/README),
  // which Next's dev server otherwise treats as a different origin than "localhost"
  // and silently refuses to serve JS assets to — breaking all client interactivity
  // (forms, buttons) with no console error. This allowlists that origin explicitly.
  allowedDevOrigins: ["127.0.0.1", "localhost"]
};

export default nextConfig;
