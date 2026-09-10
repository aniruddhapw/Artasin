import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { PortfolioGrid } from "@/components/artwork/PortfolioGrid";
import { StarRating } from "@/components/StarRating";
import { prisma } from "@/lib/db";
import { detailUrl, fullUrl, thumbUrl } from "@/lib/images";
import { serializeMoney } from "@/lib/api";

async function getArtist(slug) {
  return prisma.artistProfile.findUnique({
    where: { slug },
    include: {
      artworks: {
        where: { status: "PUBLISHED" },
        include: { media: { take: 1, orderBy: { sortOrder: "asc" } } },
        orderBy: { createdAt: "desc" }
      },
      portfolioPieces: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      }
    }
  });
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const artist = await getArtist(slug);
  if (!artist) {
    return { title: "Artist Not Found" };
  }
  return {
    title: `${artist.displayName}`,
    description: artist.bio?.slice(0, 160) || `Artwork by ${artist.displayName} on ARTISAN.`
  };
}

export default async function ArtistProfilePage({ params }) {
  const { slug } = await params;
  const artist = await getArtist(slug);

  if (!artist) {
    notFound();
  }

  const portfolio = artist.portfolioPieces.map((piece) => ({
    id: piece.id,
    title: piece.title,
    medium: piece.medium,
    year: piece.year,
    description: piece.description,
    thumb: thumbUrl(piece.imageUrl),
    detail: detailUrl(piece.imageUrl),
    full: fullUrl(piece.imageUrl)
  }));

  const [reviews, reviewAggregate] = await Promise.all([
    prisma.review.findMany({
      where: { artistId: artist.id },
      include: { buyer: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.review.aggregate({
      where: { artistId: artist.id },
      _avg: { rating: true },
      _count: true
    })
  ]);

  return (
    <>
      <Nav active="artists" />
      <main className="page request-page">
        <header className="request-header">
          <p className="byline">{artist.discipline || "Artist"}</p>
          <h1>{artist.displayName}</h1>
          {reviewAggregate._count ? (
            <StarRating count={reviewAggregate._count} value={reviewAggregate._avg.rating || 0} />
          ) : null}
          {artist.bio ? <p>{artist.bio}</p> : null}
          {artist.location ? <p className="artist-location">{artist.location}</p> : null}
          <div className="artist-header-actions">
            <Link
              className="button button-primary"
              href={`/requests?artistId=${artist.id}&artistName=${encodeURIComponent(artist.displayName)}`}
            >
              Commission {artist.displayName.split(" ")[0]}
            </Link>
          </div>
        </header>

        {artist.artworks.length ? (
          <>
            <div className="section-heading inline-heading">
              <h2>Available Work</h2>
            </div>
            <div className="gallery-grid">
              {artist.artworks.map((artwork) => (
                <Link className="more-card artwork-card group-image" href={`/artwork/${artwork.slug}`} key={artwork.id}>
                  <div>
                    <img
                      alt={`${artwork.title} artwork`}
                      src={thumbUrl(artwork.media[0]?.url) || "/artisan/artwork-placeholder.svg"}
                    />
                  </div>
                  <h3>{artwork.title}</h3>
                  <p>{serializeMoney(artwork.priceCents, artwork.currency).formatted}</p>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <p className="empty-state">
            {portfolio.length
              ? `${artist.displayName} has no pieces listed for sale right now, but takes commissions — see past work below.`
              : "This artist has not published any work yet."}
          </p>
        )}

        {portfolio.length ? (
          <section className="more-section portfolio-section">
            <div className="section-heading inline-heading">
              <h2>Past Work</h2>
              <p className="portfolio-section-note">
                Previously completed pieces, not for sale. Click any piece to zoom in.
              </p>
            </div>
            <PortfolioGrid artistName={artist.displayName} pieces={portfolio} />
            <div className="portfolio-cta">
              <p>Want something like this?</p>
              <Link
                className="button button-primary"
                href={`/requests?artistId=${artist.id}&artistName=${encodeURIComponent(artist.displayName)}`}
              >
                Request a Commission
              </Link>
            </div>
          </section>
        ) : null}

        {reviews.length ? (
          <section className="more-section">
            <div className="section-heading inline-heading">
              <h2>Reviews</h2>
              <StarRating count={reviewAggregate._count} value={reviewAggregate._avg.rating || 0} />
            </div>
            <ul className="review-list">
              {reviews.map((review) => (
                <li key={review.id}>
                  <div className="review-list-head">
                    <StarRating value={review.rating} />
                    <span className="review-author">{review.buyer.firstName} {review.buyer.lastName[0]}.</span>
                  </div>
                  {review.body ? <p>{review.body}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
      <Footer variant="simple" />
    </>
  );
}
