import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { AdminArtworkRow } from "@/components/admin/AdminArtworkRow";
import { prisma } from "@/lib/db";
import { thumbUrl } from "@/lib/images";
import { serializeMoney } from "@/lib/api";

export const metadata = {
  title: "Moderate Listings"
};

export default async function AdminArtworksPage() {
  const artworks = await prisma.artwork.findMany({
    where: { status: { not: "ARCHIVED" } },
    include: {
      artist: { select: { displayName: true } },
      media: { take: 1, orderBy: { sortOrder: "asc" } }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <>
      <Nav active="collections" />
      <main className="page request-page">
        <header className="request-header">
          <h1>Moderate Listings</h1>
          <p>Every non-archived listing across the marketplace. Archiving removes it from public view immediately.</p>
        </header>

        {artworks.length ? (
          <div className="order-history-list">
            {artworks.map((artwork) => (
              <div className="order-history-row" key={artwork.id}>
                <div className="order-history-image">
                  <img alt={artwork.title} src={thumbUrl(artwork.media[0]?.url) || "/artisan/artwork-placeholder.svg"} />
                </div>
                <div className="order-history-details">
                  <Link href={`/artwork/${artwork.slug}`}>
                    <h3>{artwork.title}</h3>
                  </Link>
                  <p>
                    {artwork.artist.displayName} · {serializeMoney(artwork.priceCents, artwork.currency).formatted}
                  </p>
                </div>
                <div className="order-history-meta">
                  <span className="tag">{artwork.status}</span>
                  <AdminArtworkRow artworkId={artwork.id} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No listings to review.</p>
        )}
      </main>
      <Footer variant="simple" />
    </>
  );
}
