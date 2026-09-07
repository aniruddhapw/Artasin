import { prisma } from "@/lib/db";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

export default async function sitemap() {
  const [artworks, artists] = await Promise.all([
    prisma.artwork.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true }
    }),
    prisma.artistProfile.findMany({
      where: { verificationStatus: "APPROVED" },
      select: { slug: true, updatedAt: true }
    })
  ]);

  const staticRoutes = [
    { url: `${siteUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/gallery`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/requests`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/terms`, changeFrequency: "yearly", priority: 0.3 }
  ];

  const artworkRoutes = artworks.map((artwork) => ({
    url: `${siteUrl}/artwork/${artwork.slug}`,
    lastModified: artwork.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8
  }));

  const artistRoutes = artists.map((artist) => ({
    url: `${siteUrl}/artist/${artist.slug}`,
    lastModified: artist.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7
  }));

  return [...staticRoutes, ...artworkRoutes, ...artistRoutes];
}
