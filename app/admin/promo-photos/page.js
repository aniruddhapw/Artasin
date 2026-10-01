import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/db";
import { thumbUrl } from "@/lib/images";

export const metadata = {
  title: "Promo Photos"
};

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

/**
 * Photos artists have given us for Instagram and other promotion, each saved
 * only after they ticked the box allowing it. Nothing here appears on the
 * public site.
 */
export default async function AdminPromoPhotosPage() {
  const photos = await prisma.artistPromoPhoto.findMany({
    include: {
      artist: {
        select: {
          displayName: true,
          slug: true,
          location: true,
          website: true,
          user: { select: { email: true, phone: true } }
        }
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <>
      <Nav />
      <main className="page request-page">
        <header className="request-header studio-header-row">
          <div>
            <h1>Promo Photos</h1>
            <p>
              {photos.length} {photos.length === 1 ? "artist has" : "artists have"} shared a photo for Instagram and
              social media. Each agreed to it being posted when they saved it. Not shown on the site.
            </p>
          </div>
          <div className="studio-header-actions">
            <Link className="button button-secondary" href="/admin/artists">
              Artists
            </Link>
          </div>
        </header>

        {photos.length ? (
          <div className="promo-gallery">
            {photos.map((photo) => (
              <figure className="promo-gallery-card" key={photo.id}>
                <a href={photo.url} rel="noreferrer" target="_blank" title="Open full size">
                  <img alt={photo.artist.displayName} loading="lazy" src={thumbUrl(photo.url)} />
                </a>
                <figcaption>
                  <strong>
                    <Link href={`/artist/${photo.artist.slug}`}>{photo.artist.displayName}</Link>
                  </strong>
                  {photo.artist.location ? <span>{photo.artist.location}</span> : null}
                  {photo.artist.website ? <span>{photo.artist.website}</span> : null}
                  <span>{photo.artist.user.email}</span>
                  {photo.artist.user.phone ? <span>{photo.artist.user.phone}</span> : null}
                  <span>Agreed {dateFormat.format(photo.consentedAt)}</span>
                  <a href={photo.url} rel="noreferrer" target="_blank">
                    Open full size
                  </a>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <p className="empty-state">No artist has added a promo photo yet. Artists add one from Studio → Profile.</p>
        )}
      </main>
      <Footer variant="simple" />
    </>
  );
}
