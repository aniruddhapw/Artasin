import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/db";
import { collectionCards, mediums } from "@/data/artisan";

async function getTrendingArtists() {
  const artistProfiles = await prisma.artistProfile.findMany({
    where: { verificationStatus: "APPROVED" },
    include: { _count: { select: { artworks: { where: { status: "PUBLISHED" } } } } },
    orderBy: { artworks: { _count: "desc" } },
    take: 3
  });
  return artistProfiles;
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
      <Nav active="collections" />
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
            <img
              alt={heroArtwork ? `${heroArtwork.title} artwork` : "Silent Echoes installation artwork"}
              src={heroArtwork?.media[0]?.url || "/artisan/hero-installation.svg"}
            />
            <div className="image-caption image-caption-overlay">
              <strong>{heroArtwork ? heroArtwork.title : "Silent Echoes, 2024"}</strong>
              <span>{heroArtwork ? heroArtwork.artist.displayName : "Elena Rostova"}</span>
            </div>
          </Link>
        </section>

        <section className="section-pad bordered-section">
          <div className="section-heading inline-heading">
            <h2>Curated Collections</h2>
            <Link className="text-link" href="/gallery">
              View All
            </Link>
          </div>
          <div className="collection-grid">
            {collectionCards.map((card, index) => (
              <Link
                className={`collection-card group-image ${index === 1 ? "offset-card" : ""}`}
                href={card.href}
                key={card.title}
              >
                <div className="collection-image">
                  <img alt={`${card.title} collection`} src={card.image} />
                </div>
                <h3>{card.title}</h3>
                <p>{card.count}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="artists-band section-pad" id="artists">
          <h2>Trending Artists</h2>
          <div className="artist-grid">
            {artists.map((artist) => (
              <Link className="artist-card group-image" href={`/artist/${artist.slug}`} key={artist.id}>
                <div className="artist-avatar">
                  <img alt={`${artist.displayName} portrait`} src="/artisan/artist-placeholder.svg" />
                </div>
                <h3>{artist.displayName}</h3>
                <p>{artist.discipline || "Artist"}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="section-pad bordered-section">
          <h2 className="medium-heading">Explore Mediums</h2>
          <div className="medium-list">
            {mediums.map((medium) => (
              <Link href={`/gallery?category=${encodeURIComponent(medium.category)}`} key={medium.category}>
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
