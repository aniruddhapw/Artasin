import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { ProfileForm } from "@/components/studio/ProfileForm";
import { getAuthUser } from "@/lib/auth";

export const metadata = {
  title: "Studio Profile"
};

export default async function StudioProfilePage() {
  const user = await getAuthUser();

  return (
    <>
      <Nav active="requests" />
      <main className="page request-page">
        <header className="request-header">
          <h1>Studio Profile</h1>
          <p>This is how collectors see you across the marketplace.</p>
        </header>
        <section className="request-layout studio-form-layout">
          <ProfileForm artistProfile={user.artistProfile} />
        </section>
      </main>
      <Footer variant="simple" />
    </>
  );
}
