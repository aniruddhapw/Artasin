import Link from "next/link";
import { Footer } from "@/components/Footer";
import { JustListed } from "@/components/home/JustListed";
import { WorkStrip } from "@/components/home/WorkStrip";
import { LazyImage } from "@/components/LazyImage";
import { Nav } from "@/components/Nav";
import { serializeMoney } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslations } from "@/lib/i18n";
import { detailUrl, stripUrl, thumbUrl } from "@/lib/images";

const RECENT_POOL = 40;
const STRIP_LIMIT = 16;
// Fewer than this can't fill a wide screen, and a strip that scrolls a couple
// of tiles across empty space looks broken rather than calm.
const STRIP_MIN = 6;
const JUST_LISTED_LIMIT = 8;
// Four across on desktop: up to seven mediums plus the commission tile.
const MEDIUM_LIMIT = 7;
const SPOTLIGHT_EXCERPT = 220;

export const metadata = {
  alternates: { canonical: "/" }
};

const withImage = {
  status: "PUBLISHED",
  media: { some: {} }
};

const cardInclude = {
  artist: { select: { displayName: true, slug: true } },
  media: { take: 1, orderBy: { sortOrder: "asc" } }
};

/**
 * Deals works out one artist at a time, so the strip never runs three pieces
 * by the same person in a row just because they uploaded a batch together.
 */
function interleaveByArtist(artworks) {
  const queues = new Map();
  for (const artwork of artworks) {
    if (!queues.has(artwork.artistId)) queues.set(artwork.artistId, []);
    queues.get(artwork.artistId).push(artwork);
  }
  const dealt = [];
  while (queues.size) {
    for (const [artistId, queue] of queues) {
      dealt.push(queue.shift());
      if (!queue.length) queues.delete(artistId);
    }
  }
  return dealt;
}

function excerpt(text, limit) {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= limit) return flat;
  return `${flat.slice(0, flat.lastIndexOf(" ", limit))}…`;
}

/**
 * An admin can pin a specific listing from /admin/artworks. Without a pin, or
 * if the pinned piece is later unpublished, the newest listing stands in.
 */
async function getSpotlight() {
  const pinned = await prisma.artwork.findFirst({
    where: { ...withImage, isHero: true },
    include: cardInclude
  });
  return (
    pinned ||
    prisma.artwork.findFirst({ where: withImage, include: cardInclude, orderBy: { createdAt: "desc" } })
  );
}

/**
 * Every medium with published work, most populated first, each with a cover.
 * The cover avoids the spotlight piece, which is already shown just above.
 */
async function getMediums(spotlightId) {
  const grouped = await prisma.artwork.groupBy({
    by: ["category"],
    where: withImage,
    _count: { category: true },
    orderBy: { _count: { category: "desc" } },
    take: MEDIUM_LIMIT
  });
  return Promise.all(
    grouped.map(async (group) => {
      const query = {
        include: { media: { take: 1, orderBy: { sortOrder: "asc" } } },
        orderBy: { createdAt: "desc" }
      };
      const cover =
        (await prisma.artwork.findFirst({
          ...query,
          where: { ...withImage, category: group.category, id: { not: spotlightId } }
        })) ||
        (await prisma.artwork.findFirst({ ...query, where: { ...withImage, category: group.category } }));
      return { category: group.category, count: group._count.category, image: thumbUrl(cover?.media[0]?.url) };
    })
  );
}

export default async function HomePage() {
  const [{ t }, user, artistCount, workCount, recent, spotlight] = await Promise.all([
    getTranslations(),
    getAuthUser(),
    prisma.artistProfile.count({ where: { verificationStatus: "APPROVED" } }),
    prisma.artwork.count({ where: { status: "PUBLISHED" } }),
    prisma.artwork.findMany({ where: withImage, include: cardInclude, orderBy: { createdAt: "desc" }, take: RECENT_POOL }),
    getSpotlight()
  ]);
  const mediums = await getMediums(spotlight?.id);

  // A category an artist typed that has no translation shows as written.
  const categoryLabel = (category) => {
    const key = `category.${category}`;
    const label = t(key);
    return label === key ? category : label;
  };

  const toCard = (artwork) => ({
    id: artwork.id,
    slug: artwork.slug,
    title: artwork.title,
    artist: artwork.artist.displayName,
    category: categoryLabel(artwork.category),
    price: serializeMoney(artwork.priceCents, artwork.currency).formatted,
    alt: t("home.workAlt", { title: artwork.title, artist: artwork.artist.displayName }),
    image: thumbUrl(artwork.media[0].url),
    stripImage: stripUrl(artwork.media[0].url)
  });

  const strip = interleaveByArtist(recent).slice(0, STRIP_LIMIT).map(toCard);
  const justListed = recent.slice(0, JUST_LISTED_LIMIT).map(toCard);
  const plural = (key, count) => t(count === 1 ? `${key}One` : key, { count });

  return (
    <>
      <Nav />
      <main className="page home-page">
        <section className="home-hero home-wrap">
          <h1>
            {t("home.hero.titleStart")} <em>{t("home.hero.titleEmphasis")}</em> {t("home.hero.titleEnd")}
          </h1>
          <div className="home-hero-side">
            <p>{t("home.hero.body")}</p>
            <div className="home-actions">
              <Link className="button button-primary" href="/gallery">
                {t("home.hero.browse")}
              </Link>
              <Link className="button button-secondary" href="/requests">
                {t("home.hero.commission")}
              </Link>
            </div>
            <p className="home-hero-facts">
              <span>{plural("home.hero.artists", artistCount)}</span>
              <span>{plural("home.hero.works", workCount)}</span>
              <span>{t("home.hero.checkout")}</span>
            </p>
          </div>
        </section>

        {strip.length >= STRIP_MIN ? (
          <section className="home-strip-section">
            <WorkStrip label={t("home.marquee.label")} works={strip} />
            <div className="home-wrap home-strip-foot">
              <span>{t("home.marquee.note")}</span>
              <Link className="text-link" href="/gallery">
                {t("home.marquee.seeAll", { count: workCount })}
              </Link>
            </div>
          </section>
        ) : null}

        {justListed.length ? (
          <section className="home-section home-wrap">
            <JustListed viewAllHref="/gallery" works={justListed} />
          </section>
        ) : null}

        {spotlight ? (
          <section className="home-section home-wrap">
            <div className="home-spotlight">
              <Link className="home-spotlight-art" href={`/artwork/${spotlight.slug}`}>
                <LazyImage
                  alt={t("home.workAlt", { title: spotlight.title, artist: spotlight.artist.displayName })}
                  src={detailUrl(spotlight.media[0].url)}
                />
              </Link>
              <div className="home-spotlight-copy">
                <span className="home-eyebrow">{t("home.spotlight.eyebrow")}</span>
                <h2>{spotlight.title}</h2>
                {spotlight.description ? <p>{excerpt(spotlight.description, SPOTLIGHT_EXCERPT)}</p> : null}
                <dl className="home-spec">
                  <dt>{t("home.spotlight.artist")}</dt>
                  <dd>{spotlight.artist.displayName}</dd>
                  <dt>{t("home.spotlight.medium")}</dt>
                  <dd>{categoryLabel(spotlight.category)}</dd>
                  <dt>{t("home.spotlight.price")}</dt>
                  <dd>{serializeMoney(spotlight.priceCents, spotlight.currency).formatted}</dd>
                </dl>
                <div className="home-actions">
                  <Link className="button button-primary" href={`/artwork/${spotlight.slug}`}>
                    {t("home.spotlight.view")}
                  </Link>
                  <Link className="button button-secondary" href={`/artist/${spotlight.artist.slug}`}>
                    {t("home.spotlight.more")}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="home-section home-wrap">
          <div className="home-head">
            <h2>{t("home.mediums.title")}</h2>
          </div>
          <div className="home-mediums">
            {mediums.map((medium) => (
              <Link
                className="home-medium"
                href={`/gallery?category=${encodeURIComponent(medium.category)}`}
                key={medium.category}
              >
                <div className="home-medium-frame">
                  {medium.image ? <LazyImage alt="" src={medium.image} /> : null}
                </div>
                <div className="home-medium-row">
                  <h3>{categoryLabel(medium.category)}</h3>
                  <span>{plural("home.mediums.works", medium.count)}</span>
                </div>
              </Link>
            ))}
            <Link className="home-medium home-medium-commission" href="/requests">
              <div className="home-medium-frame">
                <p>{t("home.mediums.commissionLead")}</p>
                <span>{t("home.mediums.commissionBody")}</span>
              </div>
              <div className="home-medium-row">
                <h3>{t("home.mediums.commissionTitle")}</h3>
                <span>{t("home.mediums.commissionCta")}</span>
              </div>
            </Link>
          </div>
        </section>

        <section className="home-band">
          <div className="home-wrap home-band-grid">
            <div className="home-band-intro">
              <h2>{t("home.commission.title")}</h2>
              <p>{t("home.commission.body")}</p>
              <Link className="button home-button-inverse" href="/requests">
                {t("home.commission.cta")}
              </Link>
            </div>
            <ol className="home-steps">
              {["step1", "step2", "step3"].map((step, index) => (
                <li key={step}>
                  <span className="home-step-number">{index + 1}</span>
                  <h3>{t(`home.commission.${step}.title`)}</h3>
                  <p>{t(`home.commission.${step}.body`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Signed-in visitors have already picked a side. */}
        {!user ? (
          <section className="home-section home-wrap">
            <div className="home-paths">
              <div className="home-path">
                <span className="home-eyebrow">{t("home.paths.collectorEyebrow")}</span>
                <h3>{t("home.paths.collectorTitle")}</h3>
                <p>{t("home.paths.collectorBody")}</p>
                <Link className="button button-primary" href="/signup?role=buyer">
                  {t("home.paths.collectorCta")}
                </Link>
              </div>
              <div className="home-path">
                <span className="home-eyebrow">{t("home.paths.artistEyebrow")}</span>
                <h3>{t("home.paths.artistTitle")}</h3>
                <p>{t("home.paths.artistBody")}</p>
                <Link className="button button-secondary" href="/signup?role=artist">
                  {t("home.paths.artistCta")}
                </Link>
              </div>
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
