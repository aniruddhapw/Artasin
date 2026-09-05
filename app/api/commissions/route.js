import { z } from "zod";
import { created, fail, handleApiError, mediaUrlSchema, moneyToCents, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { newCommissionRequestArtistEmail } from "@/lib/emails";

const commissionSchema = z.object({
  artistId: z.string().optional(),
  title: z.string().min(1),
  artworkType: z.string().min(1),
  medium: z.string().optional(),
  budgetMin: z.number().positive().optional(),
  budgetMax: z.number().positive().optional(),
  timeline: z.string().optional(),
  dimensions: z.string().optional(),
  requirements: z.string().min(10),
  referenceUrls: z.array(mediaUrlSchema).default([])
});

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return fail("Authentication required", 401);
    }

    const requests = await prisma.commissionRequest.findMany({
      where:
        user.role === "ARTIST" && user.artistProfile
          ? { artistId: user.artistProfile.id }
          : { buyerId: user.id },
      include: {
        buyer: { select: { firstName: true, lastName: true, email: true } },
        artist: { select: { displayName: true, slug: true } },
        meetings: { orderBy: { scheduledAt: "asc" } }
      },
      orderBy: { createdAt: "desc" }
    });

    return ok({ requests });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return fail("Authentication required", 401);
    }

    const input = commissionSchema.parse(await request.json());
    const commissionRequest = await prisma.commissionRequest.create({
      data: {
        buyerId: user.id,
        artistId: input.artistId,
        title: input.title,
        artworkType: input.artworkType,
        medium: input.medium,
        budgetMinCents: input.budgetMin ? moneyToCents(input.budgetMin) : null,
        budgetMaxCents: input.budgetMax ? moneyToCents(input.budgetMax) : null,
        timeline: input.timeline,
        dimensions: input.dimensions,
        requirements: input.requirements,
        referenceUrls: input.referenceUrls,
        status: input.artistId ? "ARTIST_REVIEW" : "SUBMITTED"
      },
      include: {
        artist: { select: { displayName: true, slug: true, userId: true } }
      }
    });

    if (commissionRequest.artist) {
      const artistUser = await prisma.user.findUnique({
        where: { id: commissionRequest.artist.userId },
        select: { email: true }
      });
      if (artistUser) {
        await sendEmail({
          to: artistUser.email,
          ...newCommissionRequestArtistEmail(commissionRequest, `${user.firstName} ${user.lastName}`)
        });
      }
    }

    return created({ commissionRequest });
  } catch (error) {
    return handleApiError(error);
  }
}
