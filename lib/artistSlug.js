import { prisma } from "@/lib/db";
import { ensureSlug } from "@/lib/slug";

/**
 * Two artists can share a name; the studio URL still has to be unique.
 * The second "Priya Sharma" gets priya-sharma-x7k2p rather than an error,
 * since the signup form has no field where they could pick another.
 */
export async function uniqueArtistSlug(preferred) {
  const base = ensureSlug(preferred, "artist");
  let candidate = base;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const clash = await prisma.artistProfile.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!clash) {
      return candidate;
    }
    candidate = `${base}-${Math.random().toString(36).slice(2, 7)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}
