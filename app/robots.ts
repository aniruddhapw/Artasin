import { SITE_URL } from "@/lib/seo";

const siteUrl = SITE_URL;

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/studio",
        "/studio/",
        "/admin",
        "/admin/",
        "/account",
        "/account/",
        "/orders",
        "/orders/",
        "/commissions",
        "/commissions/",
        "/checkout"
      ]
    },
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
