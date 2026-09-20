import { notFound } from "next/navigation";
import { ArtworkForm } from "@/components/studio/ArtworkForm";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Edit Listing"
};

export default async function AdminEditArtworkPage({ params }) {
  const { id } = await params;
  const artwork = await prisma.artwork.findUnique({
    where: { id },
    include: { media: { orderBy: { sortOrder: "asc" } }, artist: { select: { displayName: true } } }
  });

  if (!artwork) {
    notFound();
  }

  return (
    <>
      <Nav />
      <main className="page request-page">
        <header className="request-header">
          <h1>Edit Listing</h1>
          <p>Editing &ldquo;{artwork.title || "Untitled"}&rdquo; by {artwork.artist.displayName}.</p>
        </header>
        <section className="request-layout studio-form-layout">
          {/* An admin fix is a trusted override, so the Published option is
              always available here regardless of the artist's own verification status. */}
          <ArtworkForm artwork={artwork} verificationStatus="APPROVED" />
        </section>
      </main>
      <Footer variant="simple" />
    </>
  );
}
