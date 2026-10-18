import Link from "next/link";
import { notFound } from "next/navigation";
import { ArtworkGallery } from "@/components/artwork/ArtworkGallery";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { Icon } from "@/components/Icon";
import { ShareButton } from "@/components/ShareButton";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { LazyImage } from "@/components/LazyImage";
import { Nav } from "@/components/Nav";
import { StarRating } from "@/components/StarRating";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeMoney } from "@/lib/api";
import { createTranslator, translateOr } from "@/lib/i18n";
import { galleryImages, ogUrl, thumbUrl } from "@/lib/images";
import { DELIVERY_DAYS, RETURN_DAYS } from "@/lib/policies";
import { absoluteUrl, metaDescription, pageMetadata } from "@/lib/seo";

// The rest of this page is in English, so the style label is too.
const t = createTranslator("en");

type ArtworkWithArtist = NonNullable<Awaited<ReturnType<typeof getArtwork>>>;

/** The page's description, or a plain one from the listing's facts when it has none. */
function describe(artwork: ArtworkWithArtist): string {
  if (artwork.description.trim()) {
    // metaDescription flattens newlines too: Next.js drops the description
    // tags entirely if the text contains one.
    return metaDescription(artwork.description);
  }
  const facts = [artwork.medium, artwork.dimensions].filter(Boolean).join(", ");
  return `Original ${artwork.category.toLowerCase()} by ${artwork.artist.displayName}${facts ? `: ${facts}` : ""}. Buy it straight from the artist on ARTASIN.`;
}

async function getArtwork(slug: string) {
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

export async function generateMetadata({ params }: PageProps<"/artwork/[slug]">) {
  const { slug } = await params;
  const artwork = await getArtwork(slug);
  if (!artwork || artwork.status === "DRAFT" || artwork.status === "ARCHIVED") {
    return { title: "Artwork Not Found" };
  }
  const previewSource = artwork.media[0]?.url;
  return pageMetadata({
    title: `${artwork.title} by ${artwork.artist.displayName} – Original ${artwork.category}`,
    description: describe(artwork),
    path: `/artwork/${artwork.slug}`,
    image: previewSource ? { url: ogUrl(previewSource), width: 1200, height: 630 } : undefined
  });
}

/**
 * schema.org Product for the listing, from what the page shows: its photos,
 * price, whether it is still for sale, the artist selling it, the 7-day
 * return window, and the rating only when buyers have actually left reviews.
 */
function productData(artwork: ArtworkWithArtist, rating: { average: number; count: number }) {
  const path = `/artwork/${artwork.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: artwork.title,
    description: metaDescription(artwork.description || describe(artwork), 500),
    image: artwork.media.slice(0, 4).map((media) => absoluteUrl(media.url)),
    url: absoluteUrl(path),
    sku: artwork.id,
    category: artwork.category,
    ...(artwork.medium ? { material: artwork.medium } : {}),
    offers: {
      "@type": "Offer",
      url: absoluteUrl(path),
      price: (artwork.priceCents / 100).toFixed(2),
      priceCurrency: artwork.currency,
      availability: artwork.status === "PUBLISHED" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Person", name: artwork.artist.displayName, url: absoluteUrl(`/artist/${artwork.artist.slug}`) },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "IN",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: RETURN_DAYS
      }
    },
    ...(rating.count
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating.average.toFixed(1), reviewCount: rating.count } }
      : {})
  };
}

export default async function ArtworkDetailPage({ params }: PageProps<"/artwork/[slug]">) {
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

  const viewer = await getAuthUser();
  const isOwnWork = viewer?.artistProfile?.id === artwork.artistId;
  const inCart = viewer
    ? Boolean(
        await prisma.cartItem.findUnique({
          where: { userId_artworkId: { userId: viewer.id, artworkId: artwork.id } },
          select: { id: true }
        })
      )
    : false;

  const price = serializeMoney(artwork.priceCents, artwork.currency);
  const images = galleryImages(artwork.media, artwork.title);
  const isAvailable = artwork.status === "PUBLISHED";

  return (
    <>
      <Nav active="exhibitions" />
      <main className="page artwork-page">
        <Breadcrumbs
          items={[
            { name: "Collection", path: "/gallery" },
            { name: artwork.category, path: `/gallery?category=${encodeURIComponent(artwork.category)}` },
            { name: artwork.title, path: `/artwork/${artwork.slug}` }
          ]}
        />
        <JsonLd data={productData(artwork, { average: reviewAggregate._avg.rating ?? 0, count: reviewAggregate._count })} />
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
                <dt>Type</dt>
                <dd>
                  <Link href={`/gallery?category=${encodeURIComponent(artwork.category)}`}>
                    {artwork.category}
                  </Link>
                </dd>
              </div>
              {artwork.style ? (
                <div>
                  <dt>Style</dt>
                  <dd>
                    <Link
                      href={`/gallery?category=${encodeURIComponent(artwork.category)}&style=${encodeURIComponent(artwork.style)}`}
                    >
                      {translateOr(t, `style.${artwork.style}`, artwork.style)}
                    </Link>
                  </dd>
                </div>
              ) : null}
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
                <>
                  <Link className="button button-primary" href={`/checkout?artworkId=${artwork.id}`}>
                    Purchase
                  </Link>
                  {isOwnWork ? null : (
                    <AddToCartButton artworkId={artwork.id} inCart={inCart} isSignedIn={Boolean(viewer)} />
                  )}
                </>
              ) : (
                <button className="button button-primary" disabled type="button">
                  Sold
                </button>
              )}
              <Link
                className="button button-secondary"
                href={`/requests?artistId=${artwork.artist.id}&artistName=${encodeURIComponent(artwork.artist.displayName)}`}
              >
                Request Custom Artwork
              </Link>
              {/* Paintings for sale hang in the 3D gallery; this opens it in front of this one. */}
              {isAvailable && artwork.category === "Painting" ? (
                <Link className="button button-secondary" href={`/gallery/walk?at=${encodeURIComponent(artwork.slug)}`}>
                  See it in the 3D gallery
                </Link>
              ) : null}
              <ShareButton
                className="button button-secondary"
                path={`/artwork/${artwork.slug}`}
                text={`${artwork.title} by ${artwork.artist.displayName} on ARTASIN`}
                title={artwork.title}
              />
            </div>
            {isAvailable ? (
              <ul className="buyer-promises">
                <li>
                  <Icon name="truck" />
                  <div>
                    <strong>Delivered within {DELIVERY_DAYS} days</strong>
                    <span>Packed and shipped by the artist, anywhere in India.</span>
                  </div>
                </li>
                <li>
                  <Icon name="returns" />
                  <div>
                    <strong>Easy {RETURN_DAYS}-day returns</strong>
                    <span>
                      Not quite right? Return it within {RETURN_DAYS} days of delivery for a full refund.{" "}
                      <Link href="/terms#delivery-returns">Details</Link>
                    </span>
                  </div>
                </li>
              </ul>
            ) : null}
            {artwork.description ? (
              <div className="artist-note">
                <h2>Description</h2>
                <p>{artwork.description}</p>
              </div>
            ) : null}
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
                    <LazyImage
                      alt={`${work.title} artwork`}
                      src={thumbUrl(work.media[0]?.url) || "/artisan/artwork-placeholder.svg"}
                    />
                  </div>
                  <h3>{work.title}</h3>
                  <p>{work.category} &middot; {serializeMoney(work.priceCents, work.currency).formatted}</p>
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
