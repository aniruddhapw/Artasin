import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { CommissionRequestForm } from "@/components/requests/CommissionRequestForm";
import { prisma } from "@/lib/db";
import { getTranslations } from "@/lib/i18n";

const PROCESS_STEPS = ["step1", "step2", "step3", "step4"];

export async function generateMetadata() {
  const { t } = await getTranslations();
  return {
    title: t("request.title"),
    alternates: { canonical: "/requests" }
  };
}

export default async function RequestsPage({ searchParams }) {
  const params = await searchParams;
  const preferredArtistId = typeof params?.artistId === "string" ? params.artistId : undefined;

  const { t } = await getTranslations();

  const artists = await prisma.artistProfile.findMany({
    where: { verificationStatus: "APPROVED" },
    select: { id: true, displayName: true },
    orderBy: { displayName: "asc" }
  });

  return (
    <>
      <Nav active="requests" />
      <main className="page request-page">
        <header className="request-header">
          <h1>{t("request.title")}</h1>
          <p>{t("request.intro")}</p>
        </header>

        <section className="request-layout">
          <div className="process-column">
            <h2>{t("request.process")}</h2>
            <div className="process-list">
              {PROCESS_STEPS.map((step, index) => (
                <article className="process-step" key={step}>
                  <span>{index + 1}</span>
                  <div>
                    <h3>{t(`request.${step}.title`)}</h3>
                    <p>{t(`request.${step}.body`)}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <CommissionRequestForm artists={artists} preferredArtistId={preferredArtistId} />
        </section>
      </main>
      <Footer variant="simple" />
    </>
  );
}
