import Link from "next/link";
import { Nav } from "@/components/Nav";
import { VirtualGallery } from "@/components/gallery3d/VirtualGallery";
import { prisma } from "@/lib/db";
import { ogUrl, textureUrl, thumbUrl } from "@/lib/images";
import { serializeMoney } from "@/lib/api";
import { createTranslator, translateOr } from "@/lib/i18n";
import { JsonLd } from "@/components/JsonLd";
import { SITE_NAME, absoluteUrl, breadcrumbList, pageMetadata } from "@/lib/seo";

// The rest of this page is in English, so its labels are too.
const t = createTranslator("en");

const GALLERY_DESCRIPTION =
  "Explore original paintings by Indian artists in ARTASIN's 3D virtual art gallery. Walk up to any work to see the artist, size and price, then buy it or commission your own.";

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
  // Every ?at= view is the same page, so all share /gallery/walk as canonical;
  // only the preview card names the painting.
  return pageMetadata({
    title: painting
      ? `${painting.title} by ${painting.artist.displayName} — 3D gallery | ${SITE_NAME}`
      : `Virtual Art Gallery – Explore Original Art in 3D | ${SITE_NAME}`,
    absoluteTitle: true,
    description: painting
      ? `Walk up to "${painting.title}" by ${painting.artist.displayName} in the ARTASIN 3D gallery, then explore the whole collection.`
      : GALLERY_DESCRIPTION,
    path: "/gallery/walk",
    image: imageUrl ? { url: ogUrl(imageUrl), width: 1200, height: 630 } : undefined
  });
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
    imageUrl: textureUrl(artwork.media[0]?.url) || "/artisan/artwork-placeholder.svg",
    thumbUrl: thumbUrl(artwork.media[0]?.url) || "/artisan/artwork-placeholder.svg"
  }));

  return (
    <>
      <Nav active="exhibitions" />
      <main className="walk-page">
        <div className="walk-frame">
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
        </div>

        {/* Below the 3D view: what the gallery is, in plain HTML that search
            engines and screen readers get without running the scene, and a
            link to every painting hanging in it. */}
        <section aria-labelledby="walk-intro-title" className="walk-intro" id="walk-intro">
          <div className="walk-intro-copy">
            <p className="home-eyebrow">ARTASIN virtual art gallery</p>
            <h1 id="walk-intro-title">Step Inside Our Virtual Art Gallery</h1>
            <p>
              Explore original paintings by Indian artists in an immersive 3D gallery. Walk the corridors on
              your phone or computer, go up to any painting to see the artist, medium, size and price, and
              buy it straight from the artist. At the far end, the custom-orders desk is where to commission a
              piece of your own.
            </p>
            <p>Discover original art, and experience it in 3D.</p>
            <div className="home-actions">
              <Link className="button button-secondary" href="/gallery">
                Browse the full collection
              </Link>
              <Link className="button button-secondary" href="/artists">
                Meet the artists
              </Link>
              <Link className="button button-secondary" href="/requests">
                Commission a piece
              </Link>
            </div>
          </div>
          {paintings.length ? (
            <div className="walk-intro-works">
              <h2>
                {paintings.length} {paintings.length === 1 ? "painting" : "paintings"} in the gallery
              </h2>
              <ul>
                {paintings.map((item) => (
                  <li key={item.id}>
                    <Link href={`/artwork/${item.slug}`}>{item.title}</Link>
                    <span>
                      by <Link href={`/artist/${item.artistSlug}`}>{item.artistName}</Link> · {item.price}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
        <JsonLd
          data={[
            breadcrumbList([
              { name: "Home", path: "/" },
              { name: "Collection", path: "/gallery" },
              { name: "Virtual Art Gallery", path: "/gallery/walk" }
            ]),
            {
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: "Paintings in the ARTASIN virtual art gallery",
              numberOfItems: paintings.length,
              itemListElement: paintings.map((item, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: item.title,
                url: absoluteUrl(`/artwork/${item.slug}`)
              }))
            }
          ]}
        />
      </main>
    </>
  );
}
