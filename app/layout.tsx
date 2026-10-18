import "./globals.css";
import { Suspense } from "react";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { RouteProgress } from "@/components/RouteProgress";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { getTranslations } from "@/lib/i18n";
import { DEFAULT_SHARE_IMAGE, SITE_NAME, SITE_URL, jsonLd } from "@/lib/seo";
import { SOCIAL_LINKS } from "@/lib/socialLinks";

const siteUrl = SITE_URL;
const siteDescription =
  "Discover and buy original paintings and artwork by Indian artists. Commission a custom piece or walk through our 3D virtual art gallery.";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ARTASIN | Original Art & Custom Commissions",
    template: "%s | ARTASIN"
  },
  description: siteDescription,
  // The fallback card; pages set their own with pageMetadata() (lib/seo.ts).
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
    title: "ARTASIN | Original Art & Custom Commissions",
    description: siteDescription,
    url: siteUrl,
    images: [DEFAULT_SHARE_IMAGE]
  },
  twitter: {
    card: "summary_large_image",
    title: "ARTASIN | Original Art & Custom Commissions",
    description: siteDescription,
    images: [DEFAULT_SHARE_IMAGE.url]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "ARTASIN"
  }
};

export const viewport = {
  themeColor: "#000000",
  colorScheme: "light"
};

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ARTASIN",
    url: siteUrl,
    description: siteDescription,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/gallery?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ARTASIN",
    url: siteUrl,
    logo: `${siteUrl}/brand/artasin-lockup.png`,
    email: "support@artasin.in",
    // Tells search engines these profiles belong to the site.
    sameAs: SOCIAL_LINKS.map((link) => link.href)
  }
];

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale, messages } = await getTranslations();

  return (
    <html lang={locale}>
      <body>
        <script
          dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
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
        <LocaleProvider locale={locale} messages={messages}>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
