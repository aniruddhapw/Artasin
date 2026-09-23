import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const heroSchema = z.object({
  // null clears the pin, so the homepage falls back to the newest listing.
  artworkId: z.string().min(1).nullable()
});

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (user?.role !== "ADMIN") {
      return fail("Admin access required", 403);
    }

    const { artworkId } = heroSchema.parse(await request.json());

    if (artworkId) {
      const artwork = await prisma.artwork.findUnique({
        where: { id: artworkId },
        select: { status: true }
      });
      if (!artwork) {
        return fail("Artwork not found", 404);
      }
      // A draft or archived hero would link the homepage straight to a 404.
      if (artwork.status !== "PUBLISHED") {
        return fail("Only a published artwork can be the homepage hero", 422);
      }
    }

    await prisma.$transaction([
      prisma.artwork.updateMany({ where: { isHero: true }, data: { isHero: false } }),
      ...(artworkId
        ? [prisma.artwork.update({ where: { id: artworkId }, data: { isHero: true } })]
        : [])
    ]);

    return ok({ artworkId });
  } catch (error) {
    return handleApiError(error);
  }
}
