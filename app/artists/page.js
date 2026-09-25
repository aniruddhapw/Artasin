import Link from "next/link";
import { ArtistAvatar } from "@/components/ArtistAvatar";
import { ArtistFilters } from "@/components/artists/ArtistFilters";
import { Footer } from "@/components/Footer";
import { LazyImage } from "@/components/LazyImage";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/db";
import { thumbUrl } from "@/lib/images";

export const metadata = {
  title: "Artists",
  description:
    "Browse every verified artist on ARTASIN — painters, sculptors, photographers, and digital artists taking commissions.",
  alternates: { canonical: "/artists" }
};

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * The image that leads an artist's card: their newest listing, or failing that
 * the first piece in their portfolio.
 *
 * More than half of verified artists have neither, so a card without one falls
 * back to a monogram rather than a placeholder image. Fourteen identical grey
 * tiles would read as a broken page; a monogram reads as a design.
 */
function latestWork(artist) {
  // The newest listing is not always the one to show: a listing can be saved
  // without images, and stopping at the first would drop an artist to a
  // monogram while they have perfectly good work a row further down.
  const artwork = artist.artworks.find((row) => row.media[0]?.url);
  if (artwork) {
    return { src: thumbUrl(artwork.media[0].url), alt: `${artwork.title} by ${artist.displayName}` };
  }
  const piece = artist.portfolioPieces[0];
  if (piece?.imageUrl) {
    return { src: thumbUrl(piece.imageUrl), alt: `${piece.title} by ${artist.displayName}` };
  }
  return null;
}

export default async function ArtistsPage({ searchParams }) {
  const params = await searchParams;
  const q = text(params?.q);
  const medium = text(params?.medium);
  const location = text(params?.location);
  const showing = text(params?.showing);
  const sort = text(params?.sort);

  const artists = await prisma.artistProfile.findMany({
    where: {
      verificationStatus: "APPROVED",
      discipline: medium || undefined,
      location: location || undefined,
      OR: q
        ? [
            { displayName: { contains: q, mode: "insensitive" } },
            { discipline: { contains: q, mode: "insensitive" } },
            { location: { contains: q, mode: "insensitive" } }
          ]
        : undefined
    },
    include: {
      _count: { select: { artworks: { where: { status: "PUBLISHED" } } } },
      artworks: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { title: true, createdAt: true, media: { take: 1, orderBy: { sortOrder: "asc" } } }
      },
      portfolioPieces: {
        where: { mediaType: "IMAGE" },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        take: 1,
        select: { title: true, imageUrl: true }
      }
    }
  });

  // The dropdowns offer what artists have actually filled in. Most profiles
  // have neither field, so a fixed list of mediums would mostly lead nowhere.
  const [mediums, locations] = [
    [...new Set(artists.map((a) => text(a.discipline)).filter(Boolean))].sort(),
    [...new Set(artists.map((a) => text(a.location)).filter(Boolean))].sort()
  ];

  const filtered = artists.filter((artist) => {
    if (showing === "for-sale") return artist._count.artworks > 0;
    if (showing === "commissions") return artist._count.artworks === 0;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "name") return a.displayName.localeCompare(b.displayName);
    if (sort === "works") return b._count.artworks - a._count.artworks;
    if (sort === "newest") return b.createdAt - a.createdAt;
    // Default: whoever listed something most recently leads, and artists with
    // nothing to show fall to the end rather than opening the page with blanks.
    const left = a.artworks[0]?.createdAt;
    const right = b.artworks[0]?.createdAt;
    if (left && right) return right - left;
    if (left) return -1;
    if (right) return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  const isFiltered = Boolean(q || medium || location || showing);

  return (
    <>
      <Nav active="artists" />
      <main className="page request-page artists-page">
        <header className="artists-header">
          <div>
            <h1>Artists</h1>
            <p className="artists-lede">Meet the artists behind the work.</p>
            <p className="artists-count">
              {sorted.length} {isFiltered ? "matching" : "verified"} {sorted.length === 1 ? "artist" : "artists"}
            </p>
          </div>
          <p className="artists-tagline">
            Diverse voices,
            <br />
            timeless traditions,
            <br />
            contemporary perspectives.
          </p>
        </header>

        <ArtistFilters
          locations={locations}
          mediums={mediums}
          params={{ q, medium, location, showing, sort }}
        />

        {sorted.length ? (
          <div className="artist-grid">
            {sorted.map((artist) => {
              const work = latestWork(artist);
              const count = artist._count.artworks;
              return (
                <Link className="artist-card group-image" href={`/artist/${artist.slug}`} key={artist.id}>
                  <div className="artist-card-work">
                    {work ? (
                      <LazyImage alt={work.alt} src={work.src} />
                    ) : (
                      <ArtistAvatar name={artist.displayName} />
                    )}
                  </div>
                  <div className="artist-card-body">
                    <div>
                      <h2>
                        {artist.displayName}
                        <VerifiedMark />
                      </h2>
                      <p className="artist-card-meta">
                        {[text(artist.discipline) || "Artist", text(artist.location)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p className="artist-card-stats">
                        <span>{count ? `${count} ${count === 1 ? "work" : "works"}` : "No listings yet"}</span>
                        <span>Commissions available</span>
                      </p>
                    </div>
                    <span aria-hidden="true" className="artist-card-arrow">
                      &#8594;
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="empty-state">
            No artists match that. <Link href="/artists">Clear the filters</Link> to see everyone.
          </p>
        )}
      </main>
      <Footer variant="simple" />
    </>
  );
}

/** Every artist in this directory is verified — the page only lists approved profiles. */
function VerifiedMark() {
  return (
    <span className="artist-verified" title="Verified artist">
      <span className="visually-hidden">Verified</span>
      <svg aria-hidden="true" height="15" viewBox="0 0 24 24" width="15">
        <circle cx="12" cy="12" fill="currentColor" r="12" />
        <path d="m7 12.4 3.2 3.2L17 9" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
      </svg>
    </span>
  );
}
