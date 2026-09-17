import Link from "next/link";
import { Footer } from "@/components/Footer";
import { LazyImage } from "@/components/LazyImage";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Journal",
  description: "Process notes, studio updates, and stories from the artists on ARTASIN."
};

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function BlogIndexPage({ searchParams }) {
  const params = await searchParams;
  const artistSlug = typeof params?.artist === "string" ? params.artist : undefined;

  const posts = await prisma.blogPost.findMany({
    where: {
      status: "PUBLISHED",
      artist: artistSlug ? { slug: artistSlug } : undefined
    },
    include: { artist: { select: { displayName: true, slug: true } } },
    orderBy: { publishedAt: "desc" },
    take: 60
  });

  const filteredArtistName = artistSlug ? posts[0]?.artist.displayName : undefined;

  return (
    <>
      <Nav active="journal" />
      <main className="page request-page">
        <header className="request-header">
          <h1>Journal</h1>
          <p>
            {filteredArtistName
              ? `Posts by ${filteredArtistName}.`
              : "Process notes, studio updates, and stories from artists on ARTASIN."}
          </p>
          {artistSlug ? (
            <p>
              <Link className="text-link" href="/blog">
                View every artist&rsquo;s posts
              </Link>
            </p>
          ) : null}
        </header>

        {posts.length ? (
          <div className="blog-grid">
            {posts.map((post) => (
              <Link className="blog-card group-image" href={`/blog/${post.slug}`} key={post.id}>
                <div className="blog-card-image">
                  <LazyImage
                    alt={post.title}
                    src={post.coverImageUrl || "/artisan/artwork-placeholder.svg"}
                  />
                </div>
                <div className="blog-card-body">
                  <p className="byline">
                    {post.artist.displayName} · {dateFormat.format(post.publishedAt)}
                  </p>
                  <h3>{post.title}</h3>
                  {post.excerpt ? <p className="blog-card-excerpt">{post.excerpt}</p> : null}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-state">
            {artistSlug ? "This artist has not published any posts yet." : "No posts published yet."}
          </p>
        )}
      </main>
      <Footer />
    </>
  );
}
