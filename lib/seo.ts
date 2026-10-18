import type { Metadata } from "next";

/**
 * Shared pieces for page metadata and structured data, so every public page
 * gets a complete, consistent set: its own title and description, an
 * absolute canonical URL, and Open Graph and X cards that match.
 *
 * Next.js replaces (not merges) a parent's `openGraph` and `twitter` with a
 * page's own, so a page that set only a title kept sharing the site's generic
 * card. pageMetadata() fills every field each time.
 */

export const SITE_NAME = "ARTASIN";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001").replace(/\/$/, "");

/** A view down the 3D gallery, 1200x630: the card for pages without an image of their own. */
export const DEFAULT_SHARE_IMAGE = { url: "/og/gallery-walk.jpg", width: 1200, height: 630 };

export function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** One line, at most `limit` characters, ending on a whole word. */
export function metaDescription(text: string, limit = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= limit) {
    return flat;
  }
  const cut = flat.slice(0, limit - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : cut.length)}…`;
}

interface PageMetadataInput {
  /** Shown as "<title> | ARTASIN"; with `absoluteTitle`, exactly as given. */
  title: string;
  absoluteTitle?: boolean;
  description: string;
  /** The canonical path, e.g. "/gallery". */
  path: string;
  image?: { url: string; width?: number; height?: number } | null;
  type?: "website" | "article" | "profile";
  /** Keeps the page out of search results (its links are still followed). */
  noIndex?: boolean;
}

export function pageMetadata({
  title,
  absoluteTitle = false,
  description,
  path,
  image,
  type = "website",
  noIndex = false
}: PageMetadataInput): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  const summary = metaDescription(description);
  const shareImage = image ?? DEFAULT_SHARE_IMAGE;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: summary,
    alternates: { canonical: path },
    openGraph: {
      type,
      siteName: SITE_NAME,
      locale: "en_IN",
      title: fullTitle,
      description: summary,
      url: path,
      images: [shareImage]
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: summary,
      images: [shareImage.url]
    },
    ...(noIndex ? { robots: { index: false, follow: true } } : {})
  };
}

/**
 * JSON-LD for a <script type="application/ld+json">. "<" is escaped so text
 * from the database (a title, a bio) can never close the script tag.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** schema.org BreadcrumbList for a trail of [name, path] pairs, home first. */
export function breadcrumbList(items: readonly { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}
