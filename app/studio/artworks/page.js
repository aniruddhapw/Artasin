import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { ArtworkStatusActions } from "@/components/studio/ArtworkStatusActions";
import { VerificationBanner } from "@/components/studio/VerificationBanner";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { thumbUrl } from "@/lib/images";
import { serializeMoney } from "@/lib/api";

export const metadata = {
  title: "Manage Artworks"
};

export default async function StudioArtworksPage() {
  const user = await getAuthUser();
  const artworks = await prisma.artwork.findMany({
    where: { artistId: user.artistProfile.id, status: { not: "ARCHIVED" } },
    include: { media: { take: 1, orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <>
      <Nav active="requests" />
      <main className="page request-page">
        <VerificationBanner verificationStatus={user.artistProfile.verificationStatus} />
        <header className="request-header studio-header-row">
          <div>
            <h1>Your Artworks</h1>
            <p>Manage listings, pricing, and publication status.</p>
          </div>
          <Link className="button button-primary" href="/studio/artworks/new">
            List New Artwork
          </Link>
        </header>

        {artworks.length ? (
          <div className="order-history-list">
            {artworks.map((artwork) => (
              <div className="order-history-row" key={artwork.id}>
                <Link className="order-history-image" href={`/studio/artworks/${artwork.id}/edit`}>
                  <img
                    alt={artwork.title}
                    src={thumbUrl(artwork.media[0]?.url) || "/artisan/artwork-placeholder.svg"}
                  />
                </Link>
                <div className="order-history-details">
                  <Link href={`/studio/artworks/${artwork.id}/edit`}>
                    <h3>{artwork.title}</h3>
                  </Link>
                  <p>
                    {artwork.category} · {serializeMoney(artwork.priceCents, artwork.currency).formatted}
                  </p>
                </div>
                <div className="order-history-meta">
                  <span className="tag">{artwork.status}</span>
                  <ArtworkStatusActions
                    artworkId={artwork.id}
                    canPublish={user.artistProfile.verificationStatus === "APPROVED"}
                    status={artwork.status}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">
            You have not listed any artwork yet. <Link href="/studio/artworks/new">Create your first listing</Link>.
          </p>
        )}
      </main>
      <Footer variant="simple" />
    </>
  );
}
