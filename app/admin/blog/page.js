import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { UnpublishPostButton } from "@/components/admin/UnpublishPostButton";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Journal Review"
};

const TABS = [
  { key: "pending", label: "Waiting for review", status: "PENDING_REVIEW" },
  { key: "published", label: "Live", status: "PUBLISHED" },
  { key: "rejected", label: "Not approved", status: "REJECTED" }
];

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminBlogPage({ searchParams }) {
  const params = await searchParams;
  const tab = TABS.find((item) => item.key === params?.tab) || TABS[0];

  const [posts, counts] = await Promise.all([
    prisma.blogPost.findMany({
      where: { status: tab.status },
      include: { artist: { select: { displayName: true, verificationStatus: true } } },
      // The queue is worked oldest first; the other lists read newest first.
      orderBy: tab.status === "PENDING_REVIEW" ? { submittedAt: "asc" } : { updatedAt: "desc" }
    }),
    prisma.blogPost.groupBy({ by: ["status"], _count: { status: true } })
  ]);
  const countFor = (status) => counts.find((row) => row.status === status)?._count.status || 0;

  const dateFor = (post) => {
    if (tab.status === "PENDING_REVIEW") return `Submitted ${dateFormat.format(post.submittedAt || post.updatedAt)}`;
    if (tab.status === "PUBLISHED") return `Live since ${dateFormat.format(post.publishedAt || post.updatedAt)}`;
    return `Reviewed ${dateFormat.format(post.reviewedAt || post.updatedAt)}`;
  };

  return (
    <>
      <Nav />
      <main className="page request-page">
        <header className="request-header">
          <h1>Journal Review</h1>
          <p>
            Artists&apos; posts reach the Journal only once approved here. Unpublish a live post from the Live tab. The
            artist is emailed about every decision.
          </p>
        </header>

        <nav aria-label="Journal posts by status" className="admin-tabs">
          {TABS.map((item) => (
            <Link
              aria-current={item.key === tab.key ? "page" : undefined}
              href={`/admin/blog?tab=${item.key}`}
              key={item.key}
            >
              {item.label} <span>{countFor(item.status)}</span>
            </Link>
          ))}
        </nav>

        {posts.length ? (
          <div className="order-history-list">
            {posts.map((post) => (
              <div className="order-history-row" key={post.id}>
                <div className="order-history-image">
                  <img alt="" src={post.coverImageUrl || "/artisan/artwork-placeholder.svg"} />
                </div>
                <div className="order-history-details">
                  <Link href={`/admin/blog/${post.id}`}>
                    <h3>{post.title}</h3>
                  </Link>
                  <p>
                    {post.artist.displayName} · {dateFor(post)}
                  </p>
                  {post.reviewNote ? <p className="admin-review-note">{post.reviewNote}</p> : null}
                </div>
                <div className="order-history-meta">
                  {post.artist.verificationStatus !== "APPROVED" ? <span className="tag">Unverified artist</span> : null}
                  <Link className="small-outline" href={`/admin/blog/${post.id}`}>
                    {tab.status === "PENDING_REVIEW" ? "Review" : "Open"}
                  </Link>
                  {tab.status === "PUBLISHED" ? <UnpublishPostButton postId={post.id} /> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">
            {tab.status === "PENDING_REVIEW" ? "Nothing waiting. New submissions will appear here." : "No posts here."}
          </p>
        )}
      </main>
      <Footer variant="simple" />
    </>
  );
}
