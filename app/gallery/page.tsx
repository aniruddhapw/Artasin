import Link from "next/link";
import { Footer } from "@/components/Footer";
import { LazyImage } from "@/components/LazyImage";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/db";
import { thumbUrl } from "@/lib/images";
import { serializeMoney } from "@/lib/api";
import { artworkCategories as categories, isArtworkCategory, stylesFor, type ArtworkCategory } from "@/data/artisan";
import { pageMetadata } from "@/lib/seo";
import { createTranslator, translateOr } from "@/lib/i18n";

// The rest of this page is in English, so its labels are too.
const t = createTranslator("en");

/** How each category reads as a collection, e.g. "Original Paintings". */
const COLLECTION_NAMES: Record<ArtworkCategory, string> = {
  Painting: "Paintings",
  Sculpture: "Sculptures",
  "Digital Art": "Digital Art",
  Photography: "Photography",
  Textile: "Textile Art",
  Fashion: "Fashion",
  Illustration: "Illustrations",
  Printmaking: "Prints",
  Ceramics: "Ceramics",
  "Mixed Media": "Mixed Media Art"
};

/**
 * Each category is its own indexable collection page
 * (/gallery?category=Painting). A style within it points search engines to the
 * category, and searches (?q=) stay out of the index, so filter combinations
 * never become endless near-duplicate pages.
 */
export async function generateMetadata({ searchParams }: PageProps<"/gallery">) {
  const params = await searchParams;
  const category = isArtworkCategory(params?.category) ? params.category : undefined;
  const searching = typeof params?.q === "string" && params.q.trim() !== "";
  if (category && !searching) {
    const name = COLLECTION_NAMES[category];
    return pageMetadata({
      title: `Original ${name} by Indian Artists`,
      description: `Buy original ${name.toLowerCase()} by Indian artists on ARTASIN, straight from the artist. Every piece is one of a kind, and you can commission your own.`,
      path: `/gallery?category=${encodeURIComponent(category)}`
    });
  }
  return pageMetadata({
    title: "The Collection: Original Art by Indian Artists",
    description:
      "Browse original paintings, sculpture, photography and more by Indian artists, every piece one of a kind and bought straight from the artist.",
    path: "/gallery",
    noIndex: searching
  });
}

export default async function GalleryPage({ searchParams }: PageProps<"/gallery">) {
  const params = await searchParams;
  const category = typeof params?.category === "string" ? params.category : undefined;
  const q = typeof params?.q === "string" ? params.q : undefined;
  const style = typeof params?.style === "string" ? stylesFor(category).find((item) => item === params.style) : undefined;

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
          <h1>{isArtworkCategory(category) ? `Original ${COLLECTION_NAMES[category]}` : "The Collection"}</h1>
          <p>
            {artworks.length} original {artworks.length === 1 ? "work" : "works"} available
            {category ? ` in ${style ? `${t(`style.${style}`)} ` : ""}${category}` : ""}
            {q ? ` matching "${q}"` : ""}.
          </p>
          <Link className="button button-secondary gallery-walk-link" href="/gallery/walk">
            Walk the gallery in 3D
          </Link>
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
              href={`/gallery?category=${encodeURIComponent(category ?? "")}`}
            >
              {t("gallery.allStyles")}
            </Link>
            {listedStyles.map((item) => (
              <Link
                className={style === item ? "filter-pill is-active" : "filter-pill"}
                href={`/gallery?category=${encodeURIComponent(category ?? "")}&style=${encodeURIComponent(item)}`}
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
                  {artwork.style ? translateOr(t, `style.${artwork.style}`, artwork.style) : artwork.category} &middot; {serializeMoney(artwork.priceCents, artwork.currency).formatted}
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
