import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { PortfolioManager } from "@/components/studio/PortfolioManager";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Portfolio"
};

export default async function StudioPortfolioPage() {
  const user = await getAuthUser();
  const pieces = await prisma.portfolioPiece.findMany({
    where: { artistId: user.artistProfile.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });

  return (
    <>
      <Nav active="requests" />
      <main className="page request-page">
        <header className="request-header studio-header-row">
          <div>
            <h1>Portfolio</h1>
            <p>
              Show work you have already made, whether or not it is for sale here. This is what collectors look
              at when they are deciding who to commission — it appears on your{" "}
              <Link className="text-link" href={`/artist/${user.artistProfile.slug}`}>
                public profile
              </Link>
              .
            </p>
          </div>
          <Link className="button button-secondary" href="/studio/artworks">
            Manage Listings
          </Link>
        </header>

        <section className="request-layout studio-form-layout">
          <PortfolioManager pieces={pieces} />
        </section>
      </main>
      <Footer variant="simple" />
    </>
  );
}
