import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { SITE_NAME, absoluteUrl, metaDescription, pageMetadata } from "@/lib/seo";
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

async function getPost(slug: string) {
  return prisma.blogPost.findUnique({
    where: { slug },
    include: { artist: { select: { id: true, displayName: true, slug: true, bio: true } } }
  });
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post || post.status !== "PUBLISHED") {
    return { title: "Post Not Found" };
  }
  return pageMetadata({
    title: post.title,
    description: postSummary(post),
    path: `/blog/${slug}`,
    type: "article",
    image: post.coverImageUrl ? { url: ogUrl(post.coverImageUrl), width: 1200, height: 630 } : undefined
  });
}

/** The excerpt, or the opening of the post, as one line (newlines break the meta tags). */
function postSummary(post: { excerpt: string | null; body: string }): string {
  return metaDescription(post.excerpt || sanitizeBlogHtml(post.body).replace(/<[^>]+>/g, " "));
}

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
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
        <Breadcrumbs
          items={[
            { name: "Journal", path: "/blog" },
            { name: post.title, path: `/blog/${post.slug}` }
          ]}
        />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: postSummary(post),
            url: absoluteUrl(`/blog/${post.slug}`),
            mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
            datePublished: (post.publishedAt ?? post.createdAt).toISOString(),
            dateModified: post.updatedAt.toISOString(),
            ...(post.coverImageUrl ? { image: absoluteUrl(post.coverImageUrl) } : {}),
            author: { "@type": "Person", name: post.artist.displayName, url: absoluteUrl(`/artist/${post.artist.slug}`) },
            publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: absoluteUrl("/brand/artasin-lockup.png") } }
          }}
        />
        <article className="blog-post">
          <header className="blog-post-header">
            <p className="byline">
              <Link href={`/artist/${post.artist.slug}`}>{post.artist.displayName}</Link> ·{" "}
              {dateFormat.format(post.publishedAt ?? post.createdAt)}
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
                    <p className="byline">{dateFormat.format(other.publishedAt ?? other.createdAt)}</p>
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
