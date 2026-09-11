import { ArtworkForm } from "@/components/studio/ArtworkForm";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { getAuthUser } from "@/lib/auth";
import { getTranslations } from "@/lib/i18n";

export const metadata = {
  title: "List New Artwork"
};

export default async function NewArtworkPage() {
  const user = await getAuthUser();
  const { t } = await getTranslations();

  return (
    <>
      <Nav active="requests" />
      <main className="page request-page">
        <header className="request-header">
          <h1>{t("artworks.listNew.title")}</h1>
          <p>{t("artworks.listNew.subtitle")}</p>
        </header>
        <section className="request-layout studio-form-layout">
          <ArtworkForm verificationStatus={user.artistProfile.verificationStatus} />
        </section>
      </main>
      <Footer variant="simple" />
    </>
  );
}
