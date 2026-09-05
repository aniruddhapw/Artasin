import { fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const disputableStatuses = ["PAID", "IN_PROGRESS", "SHIPPED", "DELIVERED", "COMPLETED"];

export async function POST(request, context) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return fail("Authentication required", 401);
    }

    const { id } = await context.params;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return fail("Order not found", 404);
    }

    const isBuyer = order.buyerId === user.id;
    const isArtist = user.artistProfile && order.artistId === user.artistProfile.id;
    if (!isBuyer && !isArtist && user.role !== "ADMIN") {
      return fail("You cannot dispute this order", 403);
    }
    if (!disputableStatuses.includes(order.status)) {
      return fail(`Cannot dispute an order in ${order.status} status`, 409);
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: "DISPUTED" }
    });

    return ok({ order: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
