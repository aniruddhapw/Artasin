import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isOwnUploadUrl } from "@/lib/storage";

const saveSchema = z.object({
  url: z.string().refine(isOwnUploadUrl, { message: "Upload the photo first" }),
  // The box has to be ticked; there is no saving a photo without permission.
  consent: z.literal(true, { message: "Tick the box to let us use your photo" })
});

async function requireArtist(request) {
  const user = await getAuthUser(request);
  if (!user?.artistProfile) {
    return { error: fail("Artist account required", 403) };
  }
  return { artistId: user.artistProfile.id };
}

export async function PUT(request) {
  try {
    const { artistId, error } = await requireArtist(request);
    if (error) {
      return error;
    }
    const input = saveSchema.parse(await request.json());
    const now = new Date();
    const photo = await prisma.artistPromoPhoto.upsert({
      where: { artistId },
      create: { artistId, url: input.url, consentedAt: now },
      update: { url: input.url, consentedAt: now }
    });
    return ok({ photo: { url: photo.url, consentedAt: photo.consentedAt } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request) {
  try {
    const { artistId, error } = await requireArtist(request);
    if (error) {
      return error;
    }
    await prisma.artistPromoPhoto.deleteMany({ where: { artistId } });
    return ok({ removed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
