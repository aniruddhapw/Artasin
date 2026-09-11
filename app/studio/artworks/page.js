import Link from "next/link";
import { Footer } from "@/components/Footer";
import { LazyImage } from "@/components/LazyImage";
import { Nav } from "@/components/Nav";
import { ArtworkStatusActions } from "@/components/studio/ArtworkStatusActions";
import { ShareButton } from "@/components/ShareButton";
import { VerificationBanner } from "@/components/studio/VerificationBanner";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslations } from "@/lib/i18n";
import { thumbUrl } from "@/lib/images";
import { serializeMoney } from "@/lib/api";

export const metadata = {
  title: "Manage Artworks"
};

export default async function StudioArtworksPage() {
  const user = await getAuthUser();
  const { t } = await getTranslations();
  const artworks = await prisma.artwork.findMany({
    where: { artistId: user.artistProfile.id, status: { not: "ARCHIVED" } },
    include: { media: { take: 1, orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <>
      <Nav active="requests" />
      <main className="page request-page">
        <VerificationBanner verificationStatus={user.artistProfile.verificationStatus} />
        <header className="request-header studio-header-row">
          <div>
            <h1>{t("artworks.title")}</h1>
            <p>{t("artworks.subtitle")}</p>
          </div>
          <div className="studio-header-actions">
            <Link className="button button-secondary" href="/studio/portfolio">
              {t("studio.managePortfolio")}
            </Link>
            <Link className="button button-primary" href="/studio/artworks/new">
              {t("studio.listNewArtwork")}
            </Link>
          </div>
        </header>

        {artworks.length ? (
          <div className="order-history-list">
            {artworks.map((artwork) => (
              <div className="order-history-row" key={artwork.id}>
                <Link className="order-history-image" href={`/studio/artworks/${artwork.id}/edit`}>
                  <LazyImage
                    alt={artwork.title}
                    src={thumbUrl(artwork.media[0]?.url) || "/artisan/artwork-placeholder.svg"}
                  />
                </Link>
                <div className="order-history-details">
                  <Link href={`/studio/artworks/${artwork.id}/edit`}>
                    <h3>{artwork.title}</h3>
                  </Link>
                  <p>
                    {t(`category.${artwork.category}`)} · {serializeMoney(artwork.priceCents, artwork.currency).formatted}
                  </p>
                </div>
                <div className="order-history-meta">
                  <span className="tag">{t(`status.${artwork.status}`)}</span>
                  {artwork.status === "PUBLISHED" || artwork.status === "SOLD" ? (
                    <ShareButton
                      className="small-outline"
                      path={`/artwork/${artwork.slug}`}
                      text={`${artwork.title} — my work on ARTISAN`}
                      title={artwork.title}
                    />
                  ) : null}
                  <ArtworkStatusActions
                    artworkId={artwork.id}
                    canPublish={user.artistProfile.verificationStatus === "APPROVED"}
                    status={artwork.status}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">
            You have not listed any artwork yet. <Link href="/studio/artworks/new">Create your first listing</Link>.
          </p>
        )}
      </main>
      <Footer variant="simple" />
    </>
  );
}
