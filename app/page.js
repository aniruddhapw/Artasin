import Link from "next/link";
import { ArtistAvatar } from "@/components/ArtistAvatar";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { LazyImage } from "@/components/LazyImage";
import { Nav } from "@/components/Nav";
import { ScrollReveal } from "@/components/ScrollReveal";
import { prisma } from "@/lib/db";
import { detailUrl, thumbUrl } from "@/lib/images";
import { collectionCards, mediums } from "@/data/artisan";

const FEATURED_ARTIST_LIMIT = 4;
const PREVIEW_IMAGES_PER_ARTIST = 3;

export const metadata = {
  alternates: { canonical: "/" }
};

/**
 * Artists are featured on the strength of the work they have actually uploaded,
 * counting past work as well as listings. Ranking by published artworks alone
 * hid every artist who has a portfolio but nothing for sale yet — which is most
 * artists when they first join, and exactly the people worth surfacing.
 */
async function getTrendingArtists() {
  const artistProfiles = await prisma.artistProfile.findMany({
    where: {
      verificationStatus: "APPROVED",
      OR: [{ artworks: { some: { status: "PUBLISHED" } } }, { portfolioPieces: { some: {} } }]
    },
    include: {
      // Sold pieces still show what an artist can do, so they count as preview
      // material even though they are no longer for sale.
      artworks: {
        where: { status: { in: ["PUBLISHED", "SOLD"] } },
        include: { media: { take: 1, orderBy: { sortOrder: "asc" } } },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: PREVIEW_IMAGES_PER_ARTIST
      },
      portfolioPieces: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        take: PREVIEW_IMAGES_PER_ARTIST
      },
      _count: {
        select: { artworks: { where: { status: "PUBLISHED" } }, portfolioPieces: true }
      }
    }
  });

  return artistProfiles
    .map((artist) => {
      const listingPreviews = artist.artworks
        .filter((artwork) => artwork.media[0]?.url)
        .map((artwork) => ({ url: artwork.media[0].url, href: `/artwork/${artwork.slug}`, title: artwork.title }));
      const portfolioPreviews = artist.portfolioPieces.map((piece) => ({
        url: piece.imageUrl,
        href: `/artist/${artist.slug}`,
        title: piece.title
      }));

      return {
        id: artist.id,
        slug: artist.slug,
        displayName: artist.displayName,
        discipline: artist.discipline,
        forSaleCount: artist._count.artworks,
        totalWorks: artist._count.artworks + artist._count.portfolioPieces,
        // Listings lead, because those are the pieces a visitor can actually buy.
        previews: [...listingPreviews, ...portfolioPreviews].slice(0, PREVIEW_IMAGES_PER_ARTIST)
      };
    })
    // An artist with no usable image would render as a row of placeholders.
    .filter((artist) => artist.previews.length)
    .sort((a, b) => b.totalWorks - a.totalWorks || a.displayName.localeCompare(b.displayName))
    .slice(0, FEATURED_ARTIST_LIMIT);
}

async function getHeroArtwork() {
  return prisma.artwork.findFirst({
    where: { status: "PUBLISHED" },
    include: { artist: { select: { displayName: true } }, media: { take: 1, orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" }
  });
}

export default async function HomePage() {
  const [artists, heroArtwork] = await Promise.all([getTrendingArtists(), getHeroArtwork()]);

  return (
    <>
      <Nav />
      <ScrollReveal />
      <main className="page">
        <section className="gallery-hero section-pad">
          <div className="hero-copy">
            <h1>The Art of Visual Silence</h1>
            <p>
              Discover curated minimalist works that transform spaces through
              restraint, geometry, and masterful composition.
            </p>
            <Link className="button button-primary" href={heroArtwork ? `/artwork/${heroArtwork.slug}` : "/gallery"}>
              Explore Collection
            </Link>
          </div>
          <Link className="hero-art group-image" href={heroArtwork ? `/artwork/${heroArtwork.slug}` : "/gallery"}>
            <LazyImage
              alt={heroArtwork ? `${heroArtwork.title} artwork` : "Silent Echoes installation artwork"}
              priority
              src={detailUrl(heroArtwork?.media[0]?.url) || "/artisan/hero-installation.jpg"}
            />
            <div className="image-caption image-caption-overlay">
              <strong>{heroArtwork ? heroArtwork.title : "Silent Echoes, 2024"}</strong>
              <span>{heroArtwork ? heroArtwork.artist.displayName : "Elena Rostova"}</span>
            </div>
          </Link>
        </section>

        <section className="section-pad bordered-section">
          <div className="section-heading inline-heading" data-reveal>
            <h2>Curated Collections</h2>
            <Link className="text-link" href="/gallery">
              View All
            </Link>
          </div>
          <div className="collection-grid">
            {collectionCards.map((card, index) => (
              <Link
                className={`collection-card group-image ${index === 1 ? "offset-card" : ""}`}
                data-reveal
                href={card.href}
                key={card.title}
                style={{ "--reveal-delay": `${index * 150}ms` }}
              >
                <div className="collection-image">
                  <LazyImage alt={`${card.title} collection`} src={card.image} />
                </div>
                <h3>{card.title}</h3>
                <p>{card.count}</p>
              </Link>
            ))}
          </div>
        </section>

        {artists.length ? (
          <section className="artists-band section-pad" id="artists">
            <div className="section-heading inline-heading" data-reveal>
              <h2>Trending Artists</h2>
              <Link className="text-link" href="/artists">
                View All Artists
              </Link>
            </div>
            <div className="artist-grid">
              {artists.map((artist, index) => (
                <article
                  className="artist-card"
                  data-reveal
                  key={artist.id}
                  style={{ "--reveal-delay": `${index * 150}ms` }}
                >
                  <div className="artist-card-works">
                    {artist.previews.map((preview) => (
                      <Link
                        className="artist-card-work group-image"
                        href={preview.href}
                        key={`${artist.id}-${preview.url}`}
                        title={preview.title}
                      >
                        <LazyImage alt={`${preview.title} by ${artist.displayName}`} src={thumbUrl(preview.url)} />
                      </Link>
                    ))}
                  </div>
                  <Link className="artist-card-identity" href={`/artist/${artist.slug}`}>
                    <ArtistAvatar name={artist.displayName} />
                    <div>
                      <h3>{artist.displayName}</h3>
                      <p>{artist.discipline || "Artist"}</p>
                      <p className="artist-card-count">
                        {artist.totalWorks} {artist.totalWorks === 1 ? "work" : "works"}
                        {artist.forSaleCount ? ` · ${artist.forSaleCount} for sale` : " · taking custom requests"}
                      </p>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="section-pad bordered-section">
          <h2 className="medium-heading" data-reveal>
            Explore Mediums
          </h2>
          <div className="medium-list">
            {mediums.map((medium, index) => (
              <Link
                data-reveal
                href={`/gallery?category=${encodeURIComponent(medium.category)}`}
                key={medium.category}
                style={{ "--reveal-delay": `${index * 100}ms` }}
              >
                <span>{medium.label}</span>
                <Icon name="arrowRight" />
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
