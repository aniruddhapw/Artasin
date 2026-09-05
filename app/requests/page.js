import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { CommissionRequestForm } from "@/components/requests/CommissionRequestForm";
import { prisma } from "@/lib/db";
import { processSteps } from "@/data/artisan";

export const metadata = {
  title: "Commission a Masterpiece"
};

export default async function RequestsPage({ searchParams }) {
  const params = await searchParams;
  const preferredArtistId = typeof params?.artistId === "string" ? params.artistId : undefined;

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
          <h1>Commission a Masterpiece</h1>
          <p>
            Work directly with our curated artists to bring your unique vision
            to life. The commission process is a collaborative journey,
            beginning with your initial concept and culminating in a bespoke work
            of art.
          </p>
        </header>

        <section className="request-layout">
          <div className="process-column">
            <h2>The Process</h2>
            <div className="process-list">
              {processSteps.map((step, index) => (
                <article className="process-step" key={step.title}>
                  <span>{index + 1}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
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
