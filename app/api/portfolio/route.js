import { z } from "zod";
import { created, fail, handleApiError, mediaUrlSchema, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_PIECES = 24;

const portfolioPieceSchema = z.object({
  title: z.string().min(1, { message: "is required" }).max(160),
  description: z.string().max(2000).optional(),
  medium: z.string().max(160).optional(),
  year: z
    .number()
    .int()
    .min(1000, { message: "must be a real year" })
    .max(new Date().getFullYear(), { message: "cannot be in the future" })
    .optional(),
  imageUrl: mediaUrlSchema
});

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

    const input = portfolioPieceSchema.parse(await request.json());

    const count = await prisma.portfolioPiece.count({ where: { artistId } });
    if (count >= MAX_PIECES) {
      return fail(`You can showcase up to ${MAX_PIECES} past works`, 422);
    }

    const piece = await prisma.portfolioPiece.create({
      data: { ...input, artistId, sortOrder: count }
    });

    return created({ piece });
  } catch (error) {
    return handleApiError(error);
  }
}
