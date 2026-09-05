import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/db";
import { serializeMoney } from "@/lib/api";

export const metadata = {
  title: "Collection",
  description: "Browse the full ARTISAN collection of paintings, sculpture, digital art, and photography."
};

const categories = ["Painting", "Sculpture", "Digital Art", "Photography"];

export default async function GalleryPage({ searchParams }) {
  const params = await searchParams;
  const category = typeof params?.category === "string" ? params.category : undefined;
  const q = typeof params?.q === "string" ? params.q : undefined;

  const artworks = await prisma.artwork.findMany({
    where: {
      status: "PUBLISHED",
      category: category || undefined,
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
  });

  return (
    <>
      <Nav active="collections" />
      <main className="page request-page">
        <header className="request-header">
          <h1>The Collection</h1>
          <p>
            {artworks.length} original {artworks.length === 1 ? "work" : "works"} available
            {category ? ` in ${category}` : ""}
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

        {artworks.length ? (
          <div className="gallery-grid">
            {artworks.map((artwork) => (
              <Link className="more-card artwork-card group-image" href={`/artwork/${artwork.slug}`} key={artwork.id}>
                <div>
                  <img
                    alt={`${artwork.title} artwork`}
                    src={artwork.media[0]?.url || "/artisan/artwork-placeholder.svg"}
                  />
                </div>
                <h3>{artwork.title}</h3>
                <p>{artwork.artist.displayName}</p>
                <p>{serializeMoney(artwork.priceCents, artwork.currency).formatted}</p>
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
