import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { orderStatusChangedBuyerEmail } from "@/lib/emails";

const artistTransitions = {
  PAID: ["IN_PROGRESS", "SHIPPED"],
  IN_PROGRESS: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["COMPLETED"]
};

const updateOrderSchema = z.object({
  status: z.enum(["IN_PROGRESS", "SHIPPED", "DELIVERED", "COMPLETED"])
});

export async function GET(request, context) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return fail("Authentication required", 401);
    }

    const { id } = await context.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        artwork: { include: { media: { orderBy: { sortOrder: "asc" } } } },
        artist: { select: { displayName: true, slug: true } },
        commissionRequest: { select: { title: true } },
        transactions: true
      }
    });

    if (!order) {
      return fail("Order not found", 404);
    }

    const isOwner = order.buyerId === user.id;
    const isArtist = user.artistProfile && order.artistId === user.artistProfile.id;
    if (!isOwner && !isArtist && user.role !== "ADMIN") {
      return fail("You cannot view this order", 403);
    }

    return ok({ order });
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
    const input = updateOrderSchema.parse(await request.json());

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return fail("Order not found", 404);
    }
    if (order.artistId !== user.artistProfile.id) {
      return fail("You cannot update this order", 403);
    }

    const allowedNextStatuses = artistTransitions[order.status] || [];
    if (!allowedNextStatuses.includes(input.status)) {
      return fail(`Cannot move order from ${order.status} to ${input.status}`, 409);
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: input.status },
      include: {
        buyer: { select: { email: true } },
        artwork: { select: { title: true } },
        commissionRequest: { select: { title: true } }
      }
    });

    if (input.status === "SHIPPED" || input.status === "DELIVERED") {
      const itemTitle = updated.artwork?.title || updated.commissionRequest?.title || "your commission";
      await sendEmail({ to: updated.buyer.email, ...orderStatusChangedBuyerEmail(updated, itemTitle) });
    }

    return ok({ order: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
