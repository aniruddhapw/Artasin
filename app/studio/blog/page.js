import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { BlogPostActions } from "@/components/studio/BlogPostActions";
import { getAuthUser } from "@/lib/auth";
import { getTranslations } from "@/lib/i18n";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Journal"
};

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function StudioBlogPage() {
  const user = await getAuthUser();
  const { t } = await getTranslations();
  const posts = await prisma.blogPost.findMany({
    where: { artistId: user.artistProfile.id },
    orderBy: { createdAt: "desc" }
  });

  return (
    <>
      <Nav active="requests" />
      <main className="page request-page">
        <header className="request-header studio-header-row">
          <div>
            <h1>{t("blog.title")}</h1>
            <p>{t("blog.studioSubtitle")}</p>
          </div>
          <div className="studio-header-actions">
            <Link className="button button-secondary" href="/studio/portfolio">
              {t("studio.managePortfolio")}
            </Link>
            <Link className="button button-primary" href="/studio/blog/new">
              {t("blog.newPost")}
            </Link>
          </div>
        </header>

        {posts.length ? (
          <div className="order-history-list">
            {posts.map((post) => (
              <div className="order-history-row" key={post.id}>
                <div className="order-history-image">
                  <img
                    alt={post.title}
                    src={post.coverImageUrl || "/artisan/artwork-placeholder.svg"}
                  />
                </div>
                <div className="order-history-details">
                  <Link href={`/studio/blog/${post.id}/edit`}>
                    <h3>{post.title}</h3>
                  </Link>
                  <p>
                    {dateFormat.format(post.createdAt)}
                    {post.status === "PUBLISHED" && post.publishedAt
                      ? ` · ${t("blog.publishedOn", { date: dateFormat.format(post.publishedAt) })}`
                      : ""}
                  </p>
                </div>
                <div className="order-history-meta">
                  <span className="tag">{t(`status.${post.status}`)}</span>
                  <BlogPostActions post={post} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">{t("blog.empty")}</p>
        )}
      </main>
      <Footer variant="simple" />
    </>
  );
}
