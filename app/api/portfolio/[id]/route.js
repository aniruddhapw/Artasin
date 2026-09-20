import { z } from "zod";
import { fail, handleApiError, mediaUrlSchema, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractYouTubeId } from "@/lib/youtube";

const updatePieceSchema = z.object({
  title: z.string().trim().min(1, { message: "is required" }).max(160).optional(),
  description: z.string().max(2000).nullable().optional(),
  medium: z.string().max(160).nullable().optional(),
  year: z
    .number()
    .int()
    .min(1000, { message: "must be a real year" })
    .max(new Date().getFullYear(), { message: "cannot be in the future" })
    .nullable()
    .optional(),
  mediaType: z.enum(["IMAGE", "VIDEO"]).optional(),
  imageUrl: mediaUrlSchema.optional(),
  videoUrl: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).optional()
});

async function loadOwnedPiece(request, id) {
  const user = await getAuthUser(request);
  if (!user) {
    return { error: fail("Authentication required", 401) };
  }
  if (!user.artistProfile) {
    return { error: fail("Only artists can manage a portfolio", 403) };
  }
  const piece = await prisma.portfolioPiece.findUnique({ where: { id } });
  if (!piece) {
    return { error: fail("Portfolio piece not found", 404) };
  }
  if (piece.artistId !== user.artistProfile.id) {
    return { error: fail("This piece belongs to another artist", 403) };
  }
  return { piece, artistId: user.artistProfile.id };
}

/**
 * A reorder-only PATCH (just { sortOrder }) never touches media and should not
 * be forced to resupply an image or video URL. Anything that names mediaType,
 * imageUrl, or videoUrl is a real edit and gets the same exactly-one-of check
 * new pieces go through.
 */
function resolveMediaUpdate(input, existing) {
  const touchesMedia = "mediaType" in input || "imageUrl" in input || "videoUrl" in input;
  if (!touchesMedia) {
    return { data: {} };
  }

  const mediaType = input.mediaType || existing.mediaType;
  if (mediaType === "VIDEO") {
    const videoId = extractYouTubeId(input.videoUrl ?? existing.videoUrl);
    if (!videoId) {
      return { error: fail("Validation failed", 422, { fieldErrors: { videoUrl: ["must be a YouTube link"] } }) };
    }
    return { data: { mediaType: "VIDEO", videoUrl: videoId, imageUrl: null } };
  }

  const imageUrl = input.imageUrl ?? existing.imageUrl;
  if (!imageUrl) {
    return { error: fail("Validation failed", 422, { fieldErrors: { imageUrl: ["is required"] } }) };
  }
  return { data: { mediaType: "IMAGE", imageUrl, videoUrl: null } };
}

export async function PATCH(request, context) {
  try {
    const { id } = await context.params;
    const { piece, error } = await loadOwnedPiece(request, id);
    if (error) {
      return error;
    }

    const input = updatePieceSchema.parse(await request.json());
    const media = resolveMediaUpdate(input, piece);
    if (media.error) {
      return media.error;
    }

    const updated = await prisma.portfolioPiece.update({
      where: { id: piece.id },
      data: {
        title: input.title,
        description: input.description,
        medium: input.medium,
        year: input.year,
        sortOrder: input.sortOrder,
        ...media.data
      }
    });

    return ok({ piece: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, context) {
  try {
    const { id } = await context.params;
    const { piece, artistId, error } = await loadOwnedPiece(request, id);
    if (error) {
      return error;
    }

    await prisma.portfolioPiece.delete({ where: { id: piece.id } });

    // Close the gap the deletion leaves so the remaining order stays stable.
    const remaining = await prisma.portfolioPiece.findMany({
      where: { artistId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true }
    });
    await prisma.$transaction(
      remaining.map((row, position) =>
        prisma.portfolioPiece.update({ where: { id: row.id }, data: { sortOrder: position } })
      )
    );

    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
