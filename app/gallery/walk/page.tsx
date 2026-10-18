import Link from "next/link";
import { Nav } from "@/components/Nav";
import { VirtualGallery } from "@/components/gallery3d/VirtualGallery";
import { prisma } from "@/lib/db";
import { ogUrl, textureUrl } from "@/lib/images";
import { serializeMoney } from "@/lib/api";
import { createTranslator, translateOr } from "@/lib/i18n";

// The rest of this page is in English, so its labels are too.
const t = createTranslator("en");

const GALLERY_DESCRIPTION = "Walk through every painting in the ARTASIN collection in an interactive 3D gallery.";
// A view down the hall, 1200x630, for links to the gallery as a whole.
const GALLERY_PREVIEW = { url: "/og/gallery-walk.jpg", width: 1200, height: 630 };

/** The painting a /gallery/walk?at=<slug> link points at, if it is hanging. */
function startSlug(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

/**
 * Shared links get a preview card: the painting itself for a link to one
 * painting, otherwise a view down the hall.
 */
export async function generateMetadata({ searchParams }: PageProps<"/gallery/walk">) {
  const slug = startSlug((await searchParams).at);
  const painting = slug
    ? await prisma.artwork.findFirst({
        where: { slug, status: "PUBLISHED", category: "Painting" },
        select: {
          title: true,
          artist: { select: { displayName: true } },
          media: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } }
        }
      })
    : null;
  const imageUrl = painting?.media[0]?.url;
  const title = painting ? `${painting.title} by ${painting.artist.displayName} — 3D gallery` : "Virtual Gallery";
  const description = painting
    ? `Walk up to "${painting.title}" by ${painting.artist.displayName} in the ARTASIN 3D gallery, then explore the whole collection.`
    : GALLERY_DESCRIPTION;
  const image = imageUrl ? { url: ogUrl(imageUrl), width: 1200, height: 630 } : GALLERY_PREVIEW;
  return {
    title,
    description,
    // Every ?at= view is the same page; search engines index it once.
    alternates: { canonical: "/gallery/walk" },
    openGraph: { title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] }
  };
}

export default async function VirtualGalleryPage({ searchParams }: PageProps<"/gallery/walk">) {
  const startAt = startSlug((await searchParams).at);
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
          <VirtualGallery paintings={paintings} startAt={startAt} />
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
