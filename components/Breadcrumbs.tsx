import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbList } from "@/lib/seo";

/**
 * A visible trail back up the site (the last item is the current page) and
 * the matching BreadcrumbList for search engines, so the two never disagree.
 */
export function Breadcrumbs({ items }: { items: readonly { name: string; path: string }[] }) {
  const trail = [{ name: "Home", path: "/" }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb" className="breadcrumbs">
        <ol>
          {trail.map((item, index) =>
            index < trail.length - 1 ? (
              <li key={item.path}>
                <Link href={item.path}>{item.name}</Link>
              </li>
            ) : (
              <li aria-current="page" key={item.path}>
                {item.name}
              </li>
            )
          )}
        </ol>
      </nav>
      <JsonLd data={breadcrumbList(trail)} />
    </>
  );
}
