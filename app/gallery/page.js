import Link from "next/link";
import { Footer } from "@/components/Footer";
import { LazyImage } from "@/components/LazyImage";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/db";
import { thumbUrl } from "@/lib/images";
import { serializeMoney } from "@/lib/api";
import { artworkCategories as categories, stylesFor } from "@/data/artisan";
import { createTranslator } from "@/lib/i18n";

// The rest of this page is in English, so its labels are too.
const t = createTranslator("en");

export const metadata = {
  title: "Collection",
  description: "Browse the full ARTASIN collection of original art across every medium.",
  alternates: { canonical: "/gallery" }
};

export default async function GalleryPage({ searchParams }) {
  const params = await searchParams;
  const category = typeof params?.category === "string" ? params.category : undefined;
  const q = typeof params?.q === "string" ? params.q : undefined;
  const style = category && stylesFor(category).includes(params?.style) ? params.style : undefined;

  const [artworks, styleCounts] = await Promise.all([
    prisma.artwork.findMany({
      where: {
        status: "PUBLISHED",
        category: category || undefined,
        style,
        OR: q
          ? [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { artist: { displayName: { contains: q, mode: "insensitive" } } }
            ]
          : undefined
      },
      include: {
        artist: { select: { displayName: true, slug: true } },
        media: { take: 1, orderBy: { sortOrder: "asc" } }
      },
      orderBy: { createdAt: "desc" }
    }),
    // Only styles that have work behind them get a pill, so no filter is a dead end.
    category && stylesFor(category).length
      ? prisma.artwork.groupBy({
          by: ["style"],
          where: { status: "PUBLISHED", category, style: { not: null } },
          _count: true
        })
      : []
  ]);
  const listedStyles = stylesFor(category).filter((item) => styleCounts.some((row) => row.style === item));

  return (
    <>
      <Nav active="exhibitions" />
      <main className="page request-page">
        <header className="request-header">
          <h1>The Collection</h1>
          <p>
            {artworks.length} original {artworks.length === 1 ? "work" : "works"} available
            {category ? ` in ${style ? `${t(`style.${style}`)} ` : ""}${category}` : ""}
            {q ? ` matching "${q}"` : ""}.
          </p>
        </header>

        <div className="filter-row">
          <Link className={!category ? "filter-pill is-active" : "filter-pill"} href="/gallery">
            All
          </Link>
          {categories.map((item) => (
            <Link
              className={category === item ? "filter-pill is-active" : "filter-pill"}
              href={`/gallery?category=${encodeURIComponent(item)}`}
              key={item}
            >
              {item}
            </Link>
          ))}
        </div>

        {listedStyles.length ? (
          <div className="filter-row filter-row-sub">
            <Link
              className={!style ? "filter-pill is-active" : "filter-pill"}
              href={`/gallery?category=${encodeURIComponent(category)}`}
            >
              {t("gallery.allStyles")}
            </Link>
            {listedStyles.map((item) => (
              <Link
                className={style === item ? "filter-pill is-active" : "filter-pill"}
                href={`/gallery?category=${encodeURIComponent(category)}&style=${encodeURIComponent(item)}`}
                key={item}
              >
                {t(`style.${item}`)}
              </Link>
            ))}
          </div>
        ) : null}

        {artworks.length ? (
          <div className="gallery-grid">
            {artworks.map((artwork) => (
              <Link className="more-card artwork-card group-image" href={`/artwork/${artwork.slug}`} key={artwork.id}>
                <div>
                  <LazyImage
                    alt={`${artwork.title} artwork`}
                    src={thumbUrl(artwork.media[0]?.url) || "/artisan/artwork-placeholder.svg"}
                  />
                </div>
                <h3>{artwork.title}</h3>
                <p>{artwork.artist.displayName}</p>
                <p>
                  {artwork.style ? t(`style.${artwork.style}`) : artwork.category} &middot; {serializeMoney(artwork.priceCents, artwork.currency).formatted}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-state">
            No published artworks match this filter yet. Check back soon as artists list new work.
          </p>
        )}
      </main>
      <Footer variant="simple" />
    </>
  );
}
