import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/db";
import { serializeMoney } from "@/lib/api";

async function getArtist(slug) {
  return prisma.artistProfile.findUnique({
    where: { slug },
    include: {
      artworks: {
        where: { status: "PUBLISHED" },
        include: { media: { take: 1, orderBy: { sortOrder: "asc" } } },
        orderBy: { createdAt: "desc" }
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

  return (
    <>
      <Nav active="artists" />
      <main className="page request-page">
        <header className="request-header">
          <p className="byline">{artist.discipline || "Artist"}</p>
          <h1>{artist.displayName}</h1>
          {artist.bio ? <p>{artist.bio}</p> : null}
          {artist.location ? <p className="artist-location">{artist.location}</p> : null}
        </header>

        {artist.artworks.length ? (
          <div className="gallery-grid">
            {artist.artworks.map((artwork) => (
              <Link className="more-card artwork-card group-image" href={`/artwork/${artwork.slug}`} key={artwork.id}>
                <div>
                  <img
                    alt={`${artwork.title} artwork`}
                    src={artwork.media[0]?.url || "/artisan/artwork-placeholder.svg"}
                  />
                </div>
                <h3>{artwork.title}</h3>
                <p>{serializeMoney(artwork.priceCents, artwork.currency).formatted}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-state">This artist has not published any work yet.</p>
        )}
      </main>
      <Footer variant="simple" />
    </>
  );
}
