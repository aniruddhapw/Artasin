import Link from "next/link";
import { Nav } from "@/components/Nav";
import { VirtualGallery } from "@/components/gallery3d/VirtualGallery";
import { prisma } from "@/lib/db";
import { textureUrl } from "@/lib/images";
import { serializeMoney } from "@/lib/api";
import { createTranslator, translateOr } from "@/lib/i18n";

// The rest of this page is in English, so its labels are too.
const t = createTranslator("en");

export const metadata = {
  title: "Virtual Gallery",
  description: "Walk through every painting in the ARTASIN collection in an interactive 3D gallery.",
  alternates: { canonical: "/gallery/walk" }
};

export default async function VirtualGalleryPage() {
  const artworks = await prisma.artwork.findMany({
    where: { status: "PUBLISHED", category: "Painting" },
    include: {
      artist: { select: { displayName: true, slug: true, bio: true, location: true, discipline: true } },
      media: { take: 1, orderBy: { sortOrder: "asc" } }
    },
    orderBy: { createdAt: "desc" }
  });

  // Only plain, serialisable fields cross into the client component.
  const paintings = artworks.map((artwork) => ({
    id: artwork.id,
    slug: artwork.slug,
    title: artwork.title,
    artistName: artwork.artist.displayName,
    artistSlug: artwork.artist.slug,
    artistBio: artwork.artist.bio,
    artistLocation: artwork.artist.location,
    artistDiscipline: artwork.artist.discipline,
    style: artwork.style ? translateOr(t, `style.${artwork.style}`, artwork.style) : null,
    description: artwork.description,
    priceCents: artwork.priceCents,
    year: artwork.year,
    medium: artwork.medium,
    dimensions: artwork.dimensions,
    price: serializeMoney(artwork.priceCents, artwork.currency).formatted,
    imageUrl: textureUrl(artwork.media[0]?.url) || "/artisan/artwork-placeholder.svg"
  }));

  return (
    <>
      <Nav active="exhibitions" />
      <main className="walk-page">
        <h1 className="visually-hidden">Virtual Gallery</h1>
        {paintings.length ? (
          <VirtualGallery paintings={paintings} />
        ) : (
          <div className="walk-empty">
            <p>No paintings are hanging yet. Check back soon as artists list new work.</p>
            <Link className="button button-secondary" href="/gallery">
              Browse the collection
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
