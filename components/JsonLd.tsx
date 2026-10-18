import { jsonLd } from "@/lib/seo";

/** Structured data for search engines; renders nothing visible. */
export function JsonLd({ data }: { data: unknown }) {
  return <script dangerouslySetInnerHTML={{ __html: jsonLd(data) }} type="application/ld+json" />;
}
