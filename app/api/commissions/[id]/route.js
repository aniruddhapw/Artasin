import { z } from "zod";
import { fail, handleApiError, moneyToCents, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const artistNextStatuses = {
  ARTIST_REVIEW: ["QUOTED", "REJECTED"],
  QUOTED: ["QUOTED", "REJECTED"],
  ACCEPTED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["FINAL_REVIEW", "CANCELLED"],
  FINAL_REVIEW: ["COMPLETED", "IN_PROGRESS"]
};

const updateSchema = z.object({
  status: z.enum([
    "QUOTED",
    "ACCEPTED",
    "REJECTED",
    "IN_PROGRESS",
    "FINAL_REVIEW",
    "COMPLETED",
    "CANCELLED"
  ]),
  quotedPriceCents: z.number().int().positive().optional()
});

async function loadRequest(id) {
  return prisma.commissionRequest.findUnique({
    where: { id },
    include: {
      buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
      artist: { select: { id: true, displayName: true, slug: true, userId: true } },
      meetings: { orderBy: { scheduledAt: "asc" } },
      messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { firstName: true, lastName: true, role: true } } } },
      orders: { select: { id: true, status: true } }
    }
  });
}

export async function GET(request, context) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return fail("Authentication required", 401);
    }

    const { id } = await context.params;
    const commissionRequest = await loadRequest(id);
    if (!commissionRequest) {
      return fail("Commission request not found", 404);
    }

    const isBuyer = commissionRequest.buyerId === user.id;
    const isArtist = user.artistProfile && commissionRequest.artistId === user.artistProfile.id;
    if (!isBuyer && !isArtist && user.role !== "ADMIN") {
      return fail("You cannot view this request", 403);
    }

    return ok({ commissionRequest });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request, context) {
  try {
    const user = await getAuthUser(request);
    if (!user?.artistProfile) {
      return fail("Artist account required", 403);
    }

    const { id } = await context.params;
    const input = updateSchema.parse(await request.json());

    const commissionRequest = await prisma.commissionRequest.findUnique({ where: { id } });
    if (!commissionRequest) {
      return fail("Commission request not found", 404);
    }
    if (commissionRequest.artistId !== user.artistProfile.id) {
      return fail("You cannot manage this request", 403);
    }

    const allowedNextStatuses = artistNextStatuses[commissionRequest.status] || [];
    if (!allowedNextStatuses.includes(input.status)) {
      return fail(`Cannot move request from ${commissionRequest.status} to ${input.status}`, 409);
    }
    if (input.status === "QUOTED" && !input.quotedPriceCents) {
      return fail("quotedPriceCents is required when sending a quote", 422);
    }

    const updated = await prisma.commissionRequest.update({
      where: { id },
      data: {
        status: input.status,
        quotedPriceCents: input.quotedPriceCents ?? commissionRequest.quotedPriceCents
      }
    });

    return ok({ commissionRequest: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
