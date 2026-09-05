import { z } from "zod";
import { fail, handleApiError, mediaUrlSchema, moneyToCents, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const updateArtworkSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  description: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  medium: z.string().min(1).optional(),
  dimensions: z.string().min(1).optional(),
  year: z.number().int().optional(),
  price: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  shipsFrom: z.string().optional(),
  authenticity: z.string().optional(),
  edition: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  media: z
    .array(
      z.object({
        url: mediaUrlSchema,
        alt: z.string().min(1),
        sortOrder: z.number().int().default(0)
      })
    )
    .optional()
});

function findByIdOrSlug(identifier, include) {
  return prisma.artwork.findFirst({
    where: { OR: [{ id: identifier }, { slug: identifier }] },
    include
  });
}

async function loadOwnedArtwork(identifier, user) {
  if (!user) {
    return { error: fail("Authentication required", 401) };
  }
  const artwork = await findByIdOrSlug(identifier);
  if (!artwork) {
    return { error: fail("Artwork not found", 404) };
  }
  if (user.role === "ADMIN") {
    return { artwork, isAdmin: true };
  }
  if (!user.artistProfile || artwork.artistId !== user.artistProfile.id) {
    return { error: fail("You cannot manage this artwork", 403) };
  }
  return { artwork, isAdmin: false };
}

export async function GET(request, context) {
  try {
    const user = await getAuthUser(request);
    const { slug: identifier } = await context.params;
    const artwork = await findByIdOrSlug(identifier, {
      artist: {
        select: {
          id: true,
          displayName: true,
          slug: true,
          bio: true,
          discipline: true,
          location: true,
          verificationStatus: true
        }
      },
      media: { orderBy: { sortOrder: "asc" } },
      reviews: { take: 10, orderBy: { createdAt: "desc" } }
    });

    if (!artwork) {
      return fail("Artwork not found", 404);
    }
    const isOwner = user?.artistProfile && artwork.artistId === user.artistProfile.id;
    const isAdmin = user?.role === "ADMIN";
    if ((artwork.status === "ARCHIVED" || artwork.status === "DRAFT") && !isOwner && !isAdmin) {
      return fail("Artwork not found", 404);
    }

    return ok({ artwork });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request, context) {
  try {
    const user = await getAuthUser(request);
    const { slug: identifier } = await context.params;
    const { artwork, error, isAdmin } = await loadOwnedArtwork(identifier, user);
    if (error) {
      return error;
    }

    const input = updateArtworkSchema.parse(await request.json());

    if (isAdmin) {
      if (input.status !== "ARCHIVED" || Object.keys(input).length > 1) {
        return fail("Admins may only archive listings for moderation", 403);
      }
    } else if (input.status === "PUBLISHED" && user.artistProfile.verificationStatus !== "APPROVED") {
      return fail("Your studio must be verified by an admin before you can publish listings", 403);
    }

    const updated = await prisma.artwork.update({
      where: { id: artwork.id },
      data: {
        title: input.title,
        slug: input.slug,
        description: input.description,
        category: input.category,
        medium: input.medium,
        dimensions: input.dimensions,
        year: input.year,
        priceCents: input.price !== undefined ? moneyToCents(input.price) : undefined,
        currency: input.currency,
        shipsFrom: input.shipsFrom,
        authenticity: input.authenticity,
        edition: input.edition,
        status: input.status,
        media: input.media !== undefined ? { deleteMany: {}, create: input.media } : undefined
      },
      include: { media: true }
    });

    return ok({ artwork: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, context) {
  try {
    const user = await getAuthUser(request);
    const { slug: identifier } = await context.params;
    const { artwork, error } = await loadOwnedArtwork(identifier, user);
    if (error) {
      return error;
    }

    const archived = await prisma.artwork.update({
      where: { id: artwork.id },
      data: { status: "ARCHIVED" }
    });

    return ok({ artwork: archived });
  } catch (error) {
    return handleApiError(error);
  }
}
