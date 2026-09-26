import Link from "next/link";
import { ArtistAvatar } from "@/components/ArtistAvatar";
import { ArtistFilters } from "@/components/artists/ArtistFilters";
import { Footer } from "@/components/Footer";
import { LazyImage } from "@/components/LazyImage";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/db";
import { getTranslations } from "@/lib/i18n";
import { thumbUrl } from "@/lib/images";

export async function generateMetadata() {
  const { t } = await getTranslations();
  return {
    title: t("artists.title"),
    description: t("artists.description"),
    alternates: { canonical: "/artists" }
  };
}

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * Disciplines picked from the onboarding list have a translation; anything an
 * artist typed in themselves does not, and shows exactly as they wrote it.
 */
function disciplineLabel(t, discipline) {
  const key = `discipline.${discipline}`;
  const label = t(key);
  return label === key ? discipline : label;
}

/**
 * The image that leads an artist's card: their newest listing, or failing that
 * the first piece in their portfolio.
 *
 * More than half of verified artists have neither, so a card without one falls
 * back to a monogram rather than a placeholder image. Fourteen identical grey
 * tiles would read as a broken page; a monogram reads as a design.
 */
function latestWork(artist, t) {
  // The newest listing is not always the one to show: a listing can be saved
  // without images, and stopping at the first would drop an artist to a
  // monogram while they have perfectly good work a row further down.
  const artwork = artist.artworks.find((row) => row.media[0]?.url);
  if (artwork) {
    return {
      src: thumbUrl(artwork.media[0].url),
      alt: t("artists.workAlt", { title: artwork.title, name: artist.displayName }),
      addedAt: artwork.createdAt
    };
  }
  const piece = artist.portfolioPieces[0];
  if (piece?.imageUrl) {
    return {
      src: thumbUrl(piece.imageUrl),
      alt: t("artists.workAlt", { title: piece.title, name: artist.displayName }),
      addedAt: piece.createdAt
    };
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
  const { t } = await getTranslations();

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
        select: { title: true, imageUrl: true, createdAt: true }
      }
    }
  });

  // The dropdowns offer what artists have actually filled in. Most profiles
  // have neither field, so a fixed list of mediums would mostly lead nowhere.
  const mediums = [...new Set(artists.map((a) => text(a.discipline)).filter(Boolean))]
    .sort()
    .map((value) => ({ value, label: disciplineLabel(t, value) }));
  const locations = [...new Set(artists.map((a) => text(a.location)).filter(Boolean))].sort();

  const filtered = artists.filter((artist) => {
    if (showing === "for-sale") return artist._count.artworks > 0;
    if (showing === "commissions") return artist._count.artworks === 0;
    return true;
  });

  const works = new Map(filtered.map((artist) => [artist.id, latestWork(artist, t)]));

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "name") return a.displayName.localeCompare(b.displayName);
    // Every other order shows artists with a picture first and monograms
    // after, so the grid never alternates between the two. Having an image,
    // from a listing or the portfolio, is what counts, not having a listing:
    // an artist can list something with no photo, or show only past work.
    const left = works.get(a.id);
    const right = works.get(b.id);
    if (Boolean(left) !== Boolean(right)) return left ? -1 : 1;
    if (sort === "works") return b._count.artworks - a._count.artworks;
    if (sort === "newest") return b.createdAt - a.createdAt;
    // Default: the most recently added image leads.
    if (left && right) return right.addedAt - left.addedAt;
    return a.displayName.localeCompare(b.displayName);
  });

  const isFiltered = Boolean(q || medium || location || showing);
  const countKey = `artists.count${isFiltered ? "Matching" : "Verified"}${sorted.length === 1 ? "One" : ""}`;
  const [emptyBefore, emptyAfter] = t("artists.empty").split("{link}");

  return (
    <>
      <Nav active="artists" />
      <main className="page request-page artists-page">
        <header className="artists-header">
          <div>
            <h1>{t("artists.title")}</h1>
            <p className="artists-lede">{t("artists.lede")}</p>
            <p className="artists-count">{t(countKey, { count: sorted.length })}</p>
          </div>
          <p className="artists-tagline">
            {t("artists.tagline1")}
            <br />
            {t("artists.tagline2")}
            <br />
            {t("artists.tagline3")}
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
              const work = works.get(artist.id);
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
                        <VerifiedMark label={t("artists.verified")} title={t("artists.verifiedArtist")} />
                      </h2>
                      <p className="artist-card-meta">
                        {[
                          text(artist.discipline) ? disciplineLabel(t, text(artist.discipline)) : t("artists.artist"),
                          text(artist.location)
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p className="artist-card-stats">
                        <span>
                          {count
                            ? t(count === 1 ? "artists.worksOne" : "artists.works", { count })
                            : t("artists.noListings")}
                        </span>
                        <span>{t("artists.commissions")}</span>
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
            {emptyBefore}
            <Link href="/artists">{t("artists.clearFilters")}</Link>
            {emptyAfter}
          </p>
        )}
      </main>
      <Footer variant="simple" />
    </>
  );
}

/** Every artist in this directory is verified — the page only lists approved profiles. */
function VerifiedMark({ label, title }) {
  return (
    <span className="artist-verified" title={title}>
      <span className="visually-hidden">{label}</span>
      <svg aria-hidden="true" height="15" viewBox="0 0 24 24" width="15">
        <circle cx="12" cy="12" fill="currentColor" r="12" />
        <path d="m7 12.4 3.2 3.2L17 9" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
      </svg>
    </span>
  );
}
