import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { BlogReviewPanel } from "@/components/admin/BlogReviewPanel";
import { prisma } from "@/lib/db";
import { sanitizeBlogHtml } from "@/lib/sanitizeBlogHtml";

export const metadata = {
  title: "Review Post"
};

const STATUS_LABELS = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Waiting for review",
  PUBLISHED: "Live",
  REJECTED: "Not approved"
};

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** The post exactly as a reader would see it, with the decision alongside. */
export default async function AdminBlogPostPage({ params }) {
  const { id } = await params;
  const post = await prisma.blogPost.findUnique({
    where: { id },
    include: {
      artist: {
        select: {
          displayName: true,
          slug: true,
          verificationStatus: true,
          _count: { select: { artworks: { where: { status: "PUBLISHED" } } } }
        }
      }
    }
  });
  if (!post) {
    notFound();
  }

  return (
    <>
      <Nav />
      <main className="page">
        <div className="admin-review-layout">
          <article className="blog-post">
            <header className="blog-post-header">
              <p className="byline">
                <Link className="text-link" href="/admin/blog">
                  Journal Review
                </Link>
              </p>
              <h1>{post.title}</h1>
              {post.excerpt ? <p className="blog-post-excerpt">{post.excerpt}</p> : null}
            </header>
            {post.coverImageUrl ? (
              <div className="blog-post-cover">
                <img alt="" src={post.coverImageUrl} />
              </div>
            ) : null}
            <div className="blog-post-body" dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(post.body) }} />
          </article>

          <aside className="admin-review-panel">
            <dl className="admin-review-facts">
              <dt>Status</dt>
              <dd>{STATUS_LABELS[post.status]}</dd>
              <dt>Artist</dt>
              <dd>
                <Link className="text-link" href={`/artist/${post.artist.slug}`}>
                  {post.artist.displayName}
                </Link>
                {post.artist.verificationStatus !== "APPROVED" ? " (not verified)" : ""}
              </dd>
              <dt>Listings for sale</dt>
              <dd>{post.artist._count.artworks}</dd>
              {post.submittedAt ? (
                <>
                  <dt>Submitted</dt>
                  <dd>{dateFormat.format(post.submittedAt)}</dd>
                </>
              ) : null}
              {post.reviewNote ? (
                <>
                  <dt>Last note</dt>
                  <dd>{post.reviewNote}</dd>
                </>
              ) : null}
            </dl>
            <BlogReviewPanel postId={post.id} status={post.status} />
          </aside>
        </div>
      </main>
      <Footer variant="simple" />
    </>
  );
}
