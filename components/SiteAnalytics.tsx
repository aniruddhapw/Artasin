"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/**
 * Vercel Web Analytics: page views counted without cookies or any personal
 * identifier, served from our own domain (/_vercel/insights), so the CSP
 * needs nothing new. See also components/gallery3d/galleryEvents.ts.
 */

// Query parameters worth keeping: what was browsed and where visitors came
// from. Everything else is dropped, as some links carry private tokens
// (password resets, unsubscribes).
const KEPT_PARAMS = new Set(["at", "category", "style", "utm_source", "utm_medium", "utm_campaign"]);

export function cleanEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = new URL(event.url);
  // Our own admin visits would only skew the numbers.
  if (url.pathname.startsWith("/admin")) {
    return null;
  }
  for (const key of [...url.searchParams.keys()]) {
    if (!KEPT_PARAMS.has(key)) {
      url.searchParams.delete(key);
    }
  }
  return { ...event, url: url.toString() };
}

export function SiteAnalytics() {
  return <Analytics beforeSend={cleanEvent} />;
}
