import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { LazyImage } from "@/components/LazyImage";
import { Nav } from "@/components/Nav";
import { PortfolioGrid } from "@/components/artwork/PortfolioGrid";
import { ShareButton } from "@/components/ShareButton";
import { StarRating } from "@/components/StarRating";
import { prisma } from "@/lib/db";
import { detailUrl, fullUrl, ogUrl, thumbUrl } from "@/lib/images";
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


async function getPreviewImage(artistId, portfolioFallback) {
  const artwork = await prisma.artwork.findFirst({
    where: {
      artistId,
      status: { in: ["PUBLISHED", "SOLD"] },
      media: { some: {} }
    },
    include: { media: { take: 1, orderBy: { sortOrder: "asc" } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });
  return artwork?.media[0]?.url || portfolioFallback;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const artist = await getArtist(slug);
  if (!artist) {
    return { title: "Artist Not Found" };
  }
  // The display query only returns work that is still for sale, but a sold piece
  // is just as good for a link preview — often it is the artist's best.
  const previewSource = await getPreviewImage(artist.id, artist.portfolioPieces[0]?.imageUrl);
  const description =
    artist.bio?.slice(0, 160) ||
    `${artist.discipline || "Artist"}${artist.location ? ` in ${artist.location}` : ""} on ARTISAN — original work and commissions.`;

  return {
    title: `${artist.displayName}`,
    description,
    openGraph: {
      type: "profile",
      title: `${artist.displayName} on ARTISAN`,
      description,
      images: previewSource ? [{ url: ogUrl(previewSource), width: 1200, height: 630 }] : undefined
    },
    twitter: {
      card: previewSource ? "summary_large_image" : "summary",
      title: `${artist.displayName} on ARTISAN`,
      description,
      images: previewSource ? [ogUrl(previewSource)] : undefined
    }
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
          {!artist.artworks.length && portfolio.length ? (
            <p className="artist-availability">
              No pieces listed for sale right now — {artist.displayName.split(" ")[0]} is taking commissions.
            </p>
          ) : null}
          <div className="artist-header-actions">
            <Link
              className="button button-primary"
              href={`/requests?artistId=${artist.id}&artistName=${encodeURIComponent(artist.displayName)}`}
            >
              Commission {artist.displayName.split(" ")[0]}
            </Link>
            <ShareButton
              path={`/artist/${artist.slug}`}
              text={`${artist.displayName} on ARTISAN — original work and commissions.`}
              title={`${artist.displayName} on ARTISAN`}
            />
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
                    <LazyImage
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
        ) : portfolio.length ? null : (
          <p className="empty-state">This artist has not published any work yet.</p>
        )}

        {portfolio.length ? (
          <section
            className={
              artist.artworks.length ? "more-section portfolio-section" : "more-section portfolio-section is-lead"
            }
          >
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
