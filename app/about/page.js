import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { getTranslations } from "@/lib/i18n";

const SUPPORT_EMAIL = "support@artasin.in";

export async function generateMetadata() {
  const { t } = await getTranslations();
  return {
    title: t("about.title"),
    description: t("about.intro"),
    alternates: { canonical: "/about" }
  };
}

const ARTIST_POINTS = ["profile", "listings", "portfolio", "commissions", "journal", "language"];
const COLLECTOR_POINTS = ["originals", "commission", "follow"];

export default async function AboutPage() {
  const { t } = await getTranslations();
  const [contactBefore, contactAfter] = t("about.contact").split("{email}");

  return (
    <>
      <Nav />
      <main className="page legal-page about-page">
        <header className="request-header">
          <p className="byline">{t("about.eyebrow")}</p>
          <h1>{t("about.headline")}</h1>
          <p>{t("about.intro")}</p>
        </header>

        <figure className="about-motto">
          <figcaption>{t("about.mottoLabel")}</figcaption>
          <blockquote>{t("about.motto")}</blockquote>
        </figure>

        <section className="about-section">
          <h2>{t("about.why.title")}</h2>
          <div className="about-prose">
            <p>{t("about.why.body1")}</p>
            <p>{t("about.why.body2")}</p>
          </div>
        </section>

        <div className="about-columns">
          <section className="about-section">
            <h2>{t("about.artists.title")}</h2>
            <ul className="about-list">
              {ARTIST_POINTS.map((point) => (
                <li key={point}>{t(`about.artists.${point}`)}</li>
              ))}
            </ul>
          </section>
          <section className="about-section">
            <h2>{t("about.collectors.title")}</h2>
            <ul className="about-list">
              {COLLECTOR_POINTS.map((point) => (
                <li key={point}>{t(`about.collectors.${point}`)}</li>
              ))}
            </ul>
          </section>
        </div>

        <section className="about-section">
          <h2>{t("about.connect.title")}</h2>
          <div className="about-prose">
            <p>{t("about.connect.body")}</p>
            <p>
              <Link className="text-link" href="/artists">
                {t("nav.artists")}
              </Link>
              {" · "}
              <Link className="text-link" href="/blog">
                {t("nav.journal")}
              </Link>
            </p>
          </div>
        </section>

        <section className="about-cta">
          <h2>{t("about.cta.title")}</h2>
          <p>{t("about.cta.body")}</p>
          <div className="about-cta-actions">
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
