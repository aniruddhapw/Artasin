import { ArtworkForm } from "@/components/studio/ArtworkForm";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { getAuthUser } from "@/lib/auth";

export const metadata = {
  title: "List New Artwork"
};

export default async function NewArtworkPage() {
  const user = await getAuthUser();

  return (
    <>
      <Nav active="requests" />
      <main className="page request-page">
        <header className="request-header">
          <h1>List New Artwork</h1>
          <p>Add a new original piece to your studio collection.</p>
        </header>
        <section className="request-layout studio-form-layout">
          <ArtworkForm verificationStatus={user.artistProfile.verificationStatus} />
        </section>
      </main>
      <Footer variant="simple" />
    </>
  );
}
