import { notFound } from "next/navigation";
import { ArtworkForm } from "@/components/studio/ArtworkForm";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Edit Artwork"
};

export default async function EditArtworkPage({ params }) {
  const { id } = await params;
  const user = await getAuthUser();
  const artwork = await prisma.artwork.findUnique({
    where: { id },
    include: { media: { orderBy: { sortOrder: "asc" } } }
  });

  if (!artwork || artwork.artistId !== user.artistProfile.id) {
    notFound();
  }

  return (
    <>
      <Nav active="requests" />
      <main className="page request-page">
        <header className="request-header">
          <h1>Edit Artwork</h1>
          <p>Update details, pricing, or publication status for this piece.</p>
        </header>
        <section className="request-layout studio-form-layout">
          <ArtworkForm artwork={artwork} verificationStatus={user.artistProfile.verificationStatus} />
        </section>
      </main>
      <Footer variant="simple" />
    </>
  );
}
