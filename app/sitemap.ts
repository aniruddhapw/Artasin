import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { absoluteUrl, SITE_URL } from "@/lib/seo";

const siteUrl = SITE_URL;

// Built statically by default, which left the sitemap advertising artist and
// artwork URLs that had since been renamed or unpublished until the next deploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [artworks, artists, posts, categories] = await Promise.all([
    prisma.artwork.findMany({
      where: { status: "PUBLISHED" },
      // The first photo, so search engines find the artwork images too.
      select: { slug: true, updatedAt: true, media: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } }
    }),
    prisma.artistProfile.findMany({
      where: { verificationStatus: "APPROVED" },
      select: { slug: true, updatedAt: true }
    }),
    prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true }
    }),
    // Categories with work for sale: each is an indexable collection page
    // (app/gallery/page.tsx). Empty ones would be thin pages, so they're left out.
    prisma.artwork.groupBy({ by: ["category"], where: { status: "PUBLISHED" }, _max: { updatedAt: true } })
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/gallery`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/gallery/walk`, changeFrequency: "daily", priority: 0.7 },
    { url: `${siteUrl}/blog`, changeFrequency: "daily", priority: 0.6 },
    { url: `${siteUrl}/artists`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/requests`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/terms`, changeFrequency: "yearly", priority: 0.3 }
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((row) => ({
    url: `${siteUrl}/gallery?category=${encodeURIComponent(row.category)}`,
    lastModified: row._max.updatedAt ?? undefined,
    changeFrequency: "daily",
    priority: 0.8
  }));

  const artworkRoutes: MetadataRoute.Sitemap = artworks.map((artwork) => ({
    url: `${siteUrl}/artwork/${artwork.slug}`,
    lastModified: artwork.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
    images: artwork.media[0] ? [absoluteUrl(artwork.media[0].url)] : undefined
  }));

  const artistRoutes: MetadataRoute.Sitemap = artists.map((artist) => ({
    url: `${siteUrl}/artist/${artist.slug}`,
    lastModified: artist.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7
  }));

  const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "monthly",
    priority: 0.5
  }));

  return [...staticRoutes, ...categoryRoutes, ...artworkRoutes, ...artistRoutes, ...blogRoutes];
}
