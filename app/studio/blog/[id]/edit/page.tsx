import { notFound } from "next/navigation";
import { BlogPostForm } from "@/components/studio/BlogPostForm";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { getTranslations } from "@/lib/i18n";
import { prisma } from "@/lib/db";
import { requireArtist } from "@/lib/pageAuth";

export const metadata = {
  title: "Edit Post"
};

export default async function EditBlogPostPage({ params }: PageProps<"/studio/blog/[id]/edit">) {
  const { id } = await params;
  const user = await requireArtist(`/studio/blog/${id}/edit`);
  const { t } = await getTranslations();
  const post = await prisma.blogPost.findUnique({ where: { id } });

  if (!post || post.artistId !== user.artistProfile.id) {
    notFound();
  }

  return (
    <>
      <Nav active="requests" />
      <main className="page request-page">
        <header className="request-header">
          <h1>{t("blog.editPost")}</h1>
          <p>{t("blog.editPostSubtitle")}</p>
        </header>
        <section className="request-layout studio-form-layout">
          <BlogPostForm canPublishDirectly={user.role === "ADMIN"} post={post} />
        </section>
      </main>
      <Footer variant="simple" />
    </>
  );
}
