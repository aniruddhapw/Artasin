import Link from "next/link";
import { ArtistAvatar } from "@/components/ArtistAvatar";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { StarRating } from "@/components/StarRating";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Artists",
  description:
    "Browse every verified artist on ARTISAN — painters, sculptors, photographers, and digital artists taking commissions."
};

export default async function ArtistsPage() {
  const artists = await prisma.artistProfile.findMany({
    where: { verificationStatus: "APPROVED" },
    include: {
      _count: { select: { artworks: { where: { status: "PUBLISHED" } } } },
      reviews: { select: { rating: true } }
    },
    orderBy: { displayName: "asc" }
  });

  return (
    <>
      <Nav active="artists" />
      <main className="page request-page">
        <header className="request-header">
          <h1>Artists</h1>
          <p>
            {artists.length} verified {artists.length === 1 ? "artist" : "artists"} listing original work and
            accepting commissions.
          </p>
        </header>

        {artists.length ? (
          <div className="artist-directory">
            {artists.map((artist) => {
              const reviewCount = artist.reviews.length;
              const average = reviewCount
                ? artist.reviews.reduce((total, review) => total + review.rating, 0) / reviewCount
                : 0;

              return (
                <Link className="artist-directory-card" href={`/artist/${artist.slug}`} key={artist.id}>
                  <ArtistAvatar name={artist.displayName} />
                  <div className="artist-directory-detail">
                    <h2>{artist.displayName}</h2>
                    <p className="byline">{artist.discipline || "Artist"}</p>
                    {artist.location ? <p className="artist-location">{artist.location}</p> : null}
                    {reviewCount ? <StarRating count={reviewCount} value={average} /> : null}
                    <p className="artist-directory-count">
                      {artist._count.artworks} {artist._count.artworks === 1 ? "work" : "works"} available
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="empty-state">No verified artists yet. Check back soon.</p>
        )}
      </main>
      <Footer variant="simple" />
    </>
  );
}
