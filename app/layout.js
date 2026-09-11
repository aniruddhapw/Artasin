import "./globals.css";
import { Suspense } from "react";
import { RouteProgress } from "@/components/RouteProgress";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
const siteDescription =
  "Shop original paintings, sculpture, and photography from independent artists, or commission a custom piece made for your space. Curated, minimalist, and authenticated.";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ARTISAN | Original Art & Custom Commissions",
    template: "%s | ARTISAN"
  },
  description: siteDescription,
  keywords: [
    "buy original art online",
    "commission custom artwork",
    "independent artists",
    "minimalist art marketplace",
    "original paintings and sculpture"
  ],
  openGraph: {
    type: "website",
    siteName: "ARTISAN",
    title: "ARTISAN | Original Art & Custom Commissions",
    description: siteDescription,
    url: siteUrl
  },
  twitter: {
    card: "summary_large_image",
    title: "ARTISAN | Original Art & Custom Commissions",
    description: siteDescription
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "ARTISAN"
  }
};

export const viewport = {
  themeColor: "#000000",
  colorScheme: "light"
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ARTISAN",
  url: siteUrl,
  description: siteDescription,
  potentialAction: {
    "@type": "SearchAction",
    target: `${siteUrl}/gallery?q={search_term_string}`,
    "query-input": "required name=search_term_string"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          type="application/ld+json"
        />
        {/* The fade-in starts at opacity 0 and is cleared by the image's onLoad
            handler. Without scripting that never fires, so every photo would be
            invisible — force them visible instead. */}
        <noscript>
          <style>{".lazy-image{opacity:1!important}"}</style>
        </noscript>
        <ServiceWorkerRegister />
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
