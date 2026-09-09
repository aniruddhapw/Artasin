import Link from "next/link";
import { notFound } from "next/navigation";
import { ArtworkGallery } from "@/components/artwork/ArtworkGallery";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { StarRating } from "@/components/StarRating";
import { prisma } from "@/lib/db";
import { serializeMoney } from "@/lib/api";
import { galleryImages, thumbUrl } from "@/lib/images";

async function getArtwork(slug) {
  return prisma.artwork.findUnique({
    where: { slug },
    include: {
      artist: {
        select: {
          id: true,
          displayName: true,
          slug: true,
          bio: true,
          discipline: true,
          location: true,
          verificationStatus: true
        }
      },
      media: { orderBy: { sortOrder: "asc" } }
    }
  });
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const artwork = await getArtwork(slug);
  if (!artwork || artwork.status === "DRAFT" || artwork.status === "ARCHIVED") {
    return { title: "Artwork Not Found" };
  }
  return {
    title: `${artwork.title}`,
    description: artwork.description.slice(0, 160),
    openGraph: {
      title: artwork.title,
      description: artwork.description.slice(0, 160),
      images: artwork.media[0]?.url ? [artwork.media[0].url] : undefined
    }
  };
}

export default async function ArtworkDetailPage({ params }) {
  const { slug } = await params;
  const artwork = await getArtwork(slug);

  if (!artwork || artwork.status === "DRAFT" || artwork.status === "ARCHIVED") {
    notFound();
  }

  const [moreWorks, reviews, reviewAggregate] = await Promise.all([
    prisma.artwork.findMany({
      where: {
        artistId: artwork.artistId,
        status: "PUBLISHED",
        id: { not: artwork.id }
      },
      include: { media: { take: 1, orderBy: { sortOrder: "asc" } } },
      take: 3,
      orderBy: { createdAt: "desc" }
    }),
    prisma.review.findMany({
      where: { artworkId: artwork.id },
      include: { buyer: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.review.aggregate({
      where: { artworkId: artwork.id },
      _avg: { rating: true },
      _count: true
    })
  ]);

  const price = serializeMoney(artwork.priceCents, artwork.currency);
  const images = galleryImages(artwork.media, artwork.title);
  const isAvailable = artwork.status === "PUBLISHED";

  return (
    <>
      <Nav active="exhibitions" />
      <main className="page artwork-page">
        <section className="artwork-layout">
          <ArtworkGallery images={images} title={artwork.title} />
          <aside className="artwork-panel">
            <h1>{artwork.title}</h1>
            <p className="byline">
              by <Link href={`/artist/${artwork.artist.slug}`}>{artwork.artist.displayName}</Link>
            </p>
            <p className="price">{price.formatted}</p>
            {reviewAggregate._count ? (
              <StarRating count={reviewAggregate._count} value={reviewAggregate._avg.rating || 0} />
            ) : null}
            <dl className="spec-list">
              <div>
                <dt>Medium</dt>
                <dd>{artwork.medium}</dd>
              </div>
              <div>
                <dt>Dimensions</dt>
                <dd>{artwork.dimensions}</dd>
              </div>
              {artwork.year ? (
                <div>
                  <dt>Year</dt>
                  <dd>{artwork.year}</dd>
                </div>
              ) : null}
              {artwork.authenticity ? (
                <div>
                  <dt>Authenticity</dt>
                  <dd>{artwork.authenticity}</dd>
                </div>
              ) : null}
              {artwork.shipsFrom ? (
                <div>
                  <dt>Ships From</dt>
                  <dd>{artwork.shipsFrom}</dd>
                </div>
              ) : null}
            </dl>
            <div className="stack-actions">
              {isAvailable ? (
                <Link className="button button-primary" href={`/checkout?artworkId=${artwork.id}`}>
                  Purchase
                </Link>
              ) : (
                <button className="button button-primary" disabled type="button">
                  Sold
                </button>
              )}
              <Link
                className="button button-secondary"
                href={`/requests?artistId=${artwork.artist.id}&artistName=${encodeURIComponent(artwork.artist.displayName)}`}
              >
                Inquire for Commission
              </Link>
            </div>
            {artwork.artist.bio ? (
              <div className="artist-note">
                <h2>About the Artist</h2>
                <p>{artwork.artist.bio}</p>
              </div>
            ) : null}
          </aside>
        </section>

        {moreWorks.length ? (
          <section className="more-section">
            <div className="section-heading inline-heading">
              <h2>More from {artwork.artist.displayName}</h2>
              <Link className="text-link" href={`/artist/${artwork.artist.slug}`}>
                View Full Collection
              </Link>
            </div>
            <div className="more-grid">
              {moreWorks.map((work) => (
                <Link className="more-card group-image" href={`/artwork/${work.slug}`} key={work.id}>
                  <div>
                    <img
                      alt={`${work.title} artwork`}
                      src={thumbUrl(work.media[0]?.url) || "/artisan/artwork-placeholder.svg"}
                    />
                  </div>
                  <h3>{work.title}</h3>
                  <p>{serializeMoney(work.priceCents, work.currency).formatted}</p>
                </Link>
              ))}
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
