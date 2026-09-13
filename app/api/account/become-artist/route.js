import { z } from "zod";
import { created, fail, handleApiError } from "@/lib/api";
import { createSessionToken, getAuthUser, publicUser, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureSlug } from "@/lib/slug";

/** Two artists can share a name; the studio URL still has to be unique. */
async function uniqueArtistSlug(preferred) {
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

const becomeArtistSchema = z.object({
  displayName: z.string().min(1, { message: "is required" }).max(160),
  slug: z
    .string()
    .min(3, { message: "must be at least 3 characters" })
    .regex(/^[a-z0-9-]+$/, { message: "can only use lowercase letters, numbers, and hyphens" })
    .optional(),
  discipline: z.string().max(160).optional(),
  location: z.string().max(160).optional()
});

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return fail("Authentication required", 401);
    }
    if (user.role === "ADMIN") {
      return fail("Administrator accounts cannot open a studio", 403);
    }
    if (user.artistProfile) {
      return fail("This account already has an artist studio", 409);
    }

    const input = becomeArtistSchema.parse(await request.json());
    // Artists no longer choose this, so a clash has to resolve itself.
    const slug = await uniqueArtistSlug(input.slug || input.displayName);

    // Role and profile must move together, or the account ends up gated out of
    // /studio while owning a profile (or the reverse).
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: "ARTIST",
        artistProfile: {
          create: {
            displayName: input.displayName,
            slug,
            discipline: input.discipline || null,
            location: input.location || null
          }
        }
      },
      include: { artistProfile: true }
    });

    // The session JWT carries the role, so without a fresh cookie the edge proxy
    // keeps refusing /studio until the old token expires.
    await setSessionCookie(await createSessionToken(updated));

    return created({ user: publicUser(updated), artistProfile: updated.artistProfile });
  } catch (error) {
    return handleApiError(error);
  }
}
