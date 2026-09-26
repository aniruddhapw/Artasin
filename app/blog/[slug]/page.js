import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { ShareButton } from "@/components/ShareButton";
import { UnpublishPostButton } from "@/components/admin/UnpublishPostButton";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ogUrl } from "@/lib/images";
import { sanitizeBlogHtml } from "@/lib/sanitizeBlogHtml";

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" });

async function getPost(slug) {
  return prisma.blogPost.findUnique({
    where: { slug },
    include: { artist: { select: { id: true, displayName: true, slug: true, bio: true } } }
  });
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post || post.status !== "PUBLISHED") {
    return { title: "Post Not Found" };
  }
  const description = post.excerpt || sanitizeBlogHtml(post.body).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
  return {
    title: post.title,
    description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      title: `${post.title} — ${post.artist.displayName}`,
      description,
      images: post.coverImageUrl ? [{ url: ogUrl(post.coverImageUrl), width: 1200, height: 630 }] : undefined
    },
    twitter: {
      card: post.coverImageUrl ? "summary_large_image" : "summary",
      title: post.title,
      description,
      images: post.coverImageUrl ? [ogUrl(post.coverImageUrl)] : undefined
    }
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post || post.status !== "PUBLISHED") {
    notFound();
  }

  const [otherPosts, viewer] = await Promise.all([
    prisma.blogPost.findMany({
      where: { artistId: post.artist.id, status: "PUBLISHED", id: { not: post.id } },
      orderBy: { publishedAt: "desc" },
      take: 3
    }),
    getAuthUser()
  ]);

  // The body is sanitized again here — cheap, and a real backstop if some
  // future code path ever writes to BlogPost.body without going through the
  // API, which is the only place this is currently sanitized on the way in.
  const bodyHtml = sanitizeBlogHtml(post.body);

  return (
    <>
      <Nav active="journal" />
      <main className="page blog-post-page">
        <article className="blog-post">
          <header className="blog-post-header">
            <p className="byline">
              <Link href={`/artist/${post.artist.slug}`}>{post.artist.displayName}</Link> ·{" "}
              {dateFormat.format(post.publishedAt)}
            </p>
            <h1>{post.title}</h1>
          </header>

          {post.coverImageUrl ? (
            <div className="blog-post-cover">
              <img alt={post.title} src={post.coverImageUrl} />
            </div>
          ) : null}

          <div className="blog-post-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

          {viewer?.role === "ADMIN" ? (
            <div className="admin-post-bar">
              <span>Admin</span>
              <UnpublishPostButton postId={post.id} redirectTo="/admin/blog?tab=rejected" />
              <Link className="text-link" href={`/admin/blog/${post.id}`}>
                Unpublish with a note
              </Link>
            </div>
          ) : null}

          <div className="blog-post-actions">
            <ShareButton
              path={`/blog/${post.slug}`}
              text={`${post.title} — by ${post.artist.displayName} on ARTASIN`}
              title={post.title}
            />
            <Link className="text-link" href={`/blog?artist=${post.artist.slug}`}>
              More from {post.artist.displayName}
            </Link>
          </div>
        </article>

        {otherPosts.length ? (
          <section className="more-section">
            <div className="section-heading inline-heading">
              <h2>More from {post.artist.displayName}</h2>
              <Link className="text-link" href={`/blog?artist=${post.artist.slug}`}>
                View All
              </Link>
            </div>
            <div className="blog-grid">
              {otherPosts.map((other) => (
                <Link className="blog-card group-image" href={`/blog/${other.slug}`} key={other.id}>
                  <div className="blog-card-image">
                    <img
                      alt={other.title}
                      src={other.coverImageUrl || "/artisan/artwork-placeholder.svg"}
                    />
                  </div>
                  <div className="blog-card-body">
                    <p className="byline">{dateFormat.format(other.publishedAt)}</p>
                    <h3>{other.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
