import { BlogPostForm } from "@/components/studio/BlogPostForm";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { getTranslations } from "@/lib/i18n";
import { requireArtist } from "@/lib/pageAuth";

export const metadata = {
  title: "New Post"
};

export default async function NewBlogPostPage() {
  const [{ t }, user] = await Promise.all([getTranslations(), requireArtist("/studio/blog/new")]);
  return (
    <>
      <Nav active="requests" />
      <main className="page request-page">
        <header className="request-header">
          <h1>{t("blog.newPost")}</h1>
          <p>{t("blog.newPostSubtitle")}</p>
        </header>
        <section className="request-layout studio-form-layout">
          <BlogPostForm canPublishDirectly={user?.role === "ADMIN"} />
        </section>
      </main>
      <Footer variant="simple" />
    </>
  );
}
