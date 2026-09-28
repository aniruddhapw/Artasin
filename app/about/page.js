import Link from "next/link";
import { Footer } from "@/components/Footer";
import { LazyImage } from "@/components/LazyImage";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/db";
import { getTranslations } from "@/lib/i18n";
import { thumbUrl } from "@/lib/images";

const SUPPORT_EMAIL = "support@artasin.in";
const HERO_WORKS = 3;

export async function generateMetadata() {
  const { t } = await getTranslations();
  return {
    title: t("about.title"),
    description: t("about.description"),
    alternates: { canonical: "/about" }
  };
}

const VALUES = ["artists", "people", "roots"];
const ARTIST_POINTS = ["profile", "listings", "portfolio", "commissions", "journal", "language"];
const COLLECTOR_POINTS = ["originals", "commission", "follow", "meet"];

/**
 * The page tells the story in words and shows it in real work: the hero
 * pictures and the numbers come from the live marketplace, so they are
 * always true and never need editing.
 */
async function getAboutData() {
  const published = { status: "PUBLISHED" };
  const [artists, works, categories, recent] = await Promise.all([
    prisma.artistProfile.count({ where: { verificationStatus: "APPROVED" } }),
    prisma.artwork.count({ where: published }),
    prisma.artwork.groupBy({ by: ["category"], where: published }),
    prisma.artwork.findMany({
      where: { ...published, media: { some: {} } },
      include: {
        artist: { select: { displayName: true } },
        media: { take: 1, orderBy: { sortOrder: "asc" } }
      },
      orderBy: { createdAt: "desc" },
      take: 12
    })
  ]);

  // One piece per artist, so the hero introduces three different people.
  const seen = new Set();
  const heroWorks = [];
  for (const artwork of recent) {
    if (seen.has(artwork.artistId)) continue;
    seen.add(artwork.artistId);
    heroWorks.push(artwork);
    if (heroWorks.length === HERO_WORKS) break;
  }

  return { stats: { artists, works, mediums: categories.length }, heroWorks };
}

export default async function AboutPage() {
  const [{ t }, { stats, heroWorks }] = await Promise.all([getTranslations(), getAboutData()]);
  const [contactBefore, contactAfter] = t("about.contact").split("{email}");

  return (
    <>
      <Nav />
      <main className="page about-page">
        <section className="about-hero">
          <div className="about-hero-copy">
            <p className="about-eyebrow">{t("about.eyebrow")}</p>
            <h1>{t("about.headline")}</h1>
            <p className="about-lede">{t("about.intro")}</p>
          </div>
          {heroWorks.length === HERO_WORKS ? (
            <figure className="about-hero-art">
              <div className="about-hero-grid">
                {heroWorks.map((artwork) => (
                  <Link className="about-hero-tile" href={`/artwork/${artwork.slug}`} key={artwork.id}>
                    <LazyImage
                      alt={t("home.workAlt", { title: artwork.title, artist: artwork.artist.displayName })}
                      priority
                      src={thumbUrl(artwork.media[0].url)}
                    />
                    <span>{artwork.artist.displayName}</span>
                  </Link>
                ))}
              </div>
              <figcaption>{t("about.heroCaption")}</figcaption>
            </figure>
          ) : null}
        </section>

        <section className="about-story">
          <div className="about-story-head">
            <p className="about-eyebrow">{t("about.story.eyebrow")}</p>
            <h2>{t("about.story.title")}</h2>
          </div>
          <div className="about-story-body">
            {["p1", "p2", "p3", "p4"].map((key) => (
              <p key={key}>{t(`about.story.${key}`)}</p>
            ))}
          </div>
        </section>

        <section className="about-motto">
          <p className="about-eyebrow">{t("about.mottoLabel")}</p>
          <blockquote>{t("about.motto")}</blockquote>
        </section>

        <section aria-label={t("about.eyebrow")} className="about-stats">
          <div>
            <strong>{stats.artists}</strong>
            <span>{t("about.stats.artists")}</span>
          </div>
          <div>
            <strong>{stats.works}</strong>
            <span>{t("about.stats.works")}</span>
          </div>
          <div>
            <strong>{stats.mediums}</strong>
            <span>{t("about.stats.mediums")}</span>
          </div>
        </section>

        <section className="about-values">
          <p className="about-eyebrow">{t("about.values.eyebrow")}</p>
          <div className="about-values-grid">
            {VALUES.map((value, index) => (
              <article key={value}>
                <span className="about-value-number">{String(index + 1).padStart(2, "0")}</span>
                <h3>{t(`about.values.${value}.title`)}</h3>
                <p>{t(`about.values.${value}.body`)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-columns">
          <div>
            <h2>{t("about.artists.title")}</h2>
            <ul className="about-list">
              {ARTIST_POINTS.map((point) => (
                <li key={point}>{t(`about.artists.${point}`)}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2>{t("about.collectors.title")}</h2>
            <ul className="about-list">
              {COLLECTOR_POINTS.map((point) => (
                <li key={point}>{t(`about.collectors.${point}`)}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="about-connect">
          <h2>{t("about.connect.title")}</h2>
          <p>{t("about.connect.body")}</p>
          <div className="about-actions">
            <Link className="text-link" href="/artists">
              {t("about.connect.artists")}
            </Link>
            <Link className="text-link" href="/blog">
              {t("about.connect.journal")}
            </Link>
          </div>
        </section>

        <section className="about-cta">
          <h2>{t("about.cta.title")}</h2>
          <p>{t("about.cta.body")}</p>
          <div className="about-actions">
            <Link className="button button-primary" href="/signup?role=artist">
              {t("about.cta.artist")}
            </Link>
            <Link className="button button-secondary" href="/gallery">
              {t("about.cta.browse")}
            </Link>
          </div>
          <p className="about-contact">
            {contactBefore}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            {contactAfter}
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
