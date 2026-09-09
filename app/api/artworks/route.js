import { z } from "zod";
import { created, fail, handleApiError, mediaUrlSchema, moneyToCents, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const createArtworkSchema = z.object({
  title: z.string().min(1),
  slug: z
    .string()
    .min(3, "must be at least 3 characters")
    .regex(/^[a-z0-9-]+$/, "can only use lowercase letters, numbers, and hyphens"),
  description: z.string().min(1),
  category: z.string().min(1),
  medium: z.string().min(1),
  dimensions: z.string().min(1),
  year: z.number().int().optional(),
  price: z.number().positive("must be greater than zero"),
  currency: z.string().length(3).default("INR"),
  shipsFrom: z.string().optional(),
  authenticity: z.string().optional(),
  edition: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  media: z
    .array(
      z.object({
        url: mediaUrlSchema,
        alt: z.string().min(1),
        sortOrder: z.number().int().default(0)
      })
    )
    .default([])
});

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const q = searchParams.get("q");

    const artworks = await prisma.artwork.findMany({
      where: {
        status: "PUBLISHED",
        category: category || undefined,
        OR: q
          ? [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { artist: { displayName: { contains: q, mode: "insensitive" } } }
            ]
          : undefined
      },
      include: {
        artist: { select: { displayName: true, slug: true, location: true } },
        media: { orderBy: { sortOrder: "asc" } }
      },
      orderBy: { createdAt: "desc" }
    });

    return ok({ artworks });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user?.artistProfile) {
      return fail("Artist account required", 403);
    }

    const input = createArtworkSchema.parse(await request.json());
    if (input.status === "PUBLISHED" && user.artistProfile.verificationStatus !== "APPROVED") {
      return fail("Your studio must be verified by an admin before you can publish listings", 403);
    }

    const artwork = await prisma.artwork.create({
      data: {
        artistId: user.artistProfile.id,
        title: input.title,
        slug: input.slug,
        description: input.description,
        category: input.category,
        medium: input.medium,
        dimensions: input.dimensions,
        year: input.year,
        priceCents: moneyToCents(input.price),
        currency: input.currency,
        shipsFrom: input.shipsFrom,
        authenticity: input.authenticity,
        edition: input.edition,
        status: input.status,
        media: { create: input.media }
      },
      include: { media: true, artist: true }
    });

    return created({ artwork });
  } catch (error) {
    return handleApiError(error);
  }
}
