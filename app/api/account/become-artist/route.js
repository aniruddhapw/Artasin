import { z } from "zod";
import { created, fail, handleApiError } from "@/lib/api";
import { createSessionToken, getAuthUser, publicUser, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureSlug } from "@/lib/slug";

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
    const slug = input.slug || ensureSlug(input.displayName, "artist");

    const existing = await prisma.artistProfile.findUnique({ where: { slug } });
    if (existing) {
      return fail("That studio URL is already taken. Please choose another.", 409, {
        fieldErrors: { slug: ["is already taken"] }
      });
    }

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
