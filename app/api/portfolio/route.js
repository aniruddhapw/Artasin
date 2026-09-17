import { z } from "zod";
import { created, fail, handleApiError, mediaUrlSchema, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractYouTubeId } from "@/lib/youtube";

const MAX_PIECES = 24;

const basePieceSchema = z.object({
  title: z.string().min(1, { message: "is required" }).max(160),
  description: z.string().max(2000).optional(),
  medium: z.string().max(160).optional(),
  year: z
    .number()
    .int()
    .min(1000, { message: "must be a real year" })
    .max(new Date().getFullYear(), { message: "cannot be in the future" })
    .optional(),
  mediaType: z.enum(["IMAGE", "VIDEO"]).default("IMAGE"),
  imageUrl: mediaUrlSchema.optional(),
  videoUrl: z.string().max(500).optional()
});

/**
 * mediaType picks which of imageUrl/videoUrl is required — Zod's object schema
 * cannot express that on its own, so it is checked after parsing and the video
 * URL is normalised to a bare id at the same time, which is what gets stored.
 */
function resolveMedia(input) {
  if (input.mediaType === "VIDEO") {
    const videoId = extractYouTubeId(input.videoUrl);
    if (!videoId) {
      return { error: fail("Validation failed", 422, { fieldErrors: { videoUrl: ["must be a YouTube link"] } }) };
    }
    return { data: { mediaType: "VIDEO", videoUrl: videoId, imageUrl: null } };
  }
  if (!input.imageUrl) {
    return { error: fail("Validation failed", 422, { fieldErrors: { imageUrl: ["is required"] } }) };
  }
  return { data: { mediaType: "IMAGE", imageUrl: input.imageUrl, videoUrl: null } };
}

async function requireArtist(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return { error: fail("Authentication required", 401) };
  }
  if (!user.artistProfile) {
    return { error: fail("Only artists can manage a portfolio", 403) };
  }
  return { artistId: user.artistProfile.id };
}

export async function GET(request) {
  try {
    const { artistId, error } = await requireArtist(request);
    if (error) {
      return error;
    }
    const pieces = await prisma.portfolioPiece.findMany({
      where: { artistId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    });
    return ok({ pieces });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const { artistId, error } = await requireArtist(request);
    if (error) {
      return error;
    }

    const input = basePieceSchema.parse(await request.json());
    const media = resolveMedia(input);
    if (media.error) {
      return media.error;
    }

    const count = await prisma.portfolioPiece.count({ where: { artistId } });
    if (count >= MAX_PIECES) {
      return fail(`You can showcase up to ${MAX_PIECES} past works`, 422);
    }

    const piece = await prisma.portfolioPiece.create({
      data: {
        title: input.title,
        description: input.description,
        medium: input.medium,
        year: input.year,
        artistId,
        sortOrder: count,
        ...media.data
      }
    });

    return created({ piece });
  } catch (error) {
    return handleApiError(error);
  }
}
