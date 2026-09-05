import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ARTISAN | Curated Art Marketplace",
    template: "%s | ARTISAN"
  },
  description:
    "A production-grade minimalist art marketplace for collections, commissions, and artist studio operations."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
