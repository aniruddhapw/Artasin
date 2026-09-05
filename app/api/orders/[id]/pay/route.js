import { fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments";

export async function POST(request, context) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return fail("Authentication required", 401);
    }

    const { id } = await context.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { transactions: true }
    });

    if (!order) {
      return fail("Order not found", 404);
    }
    if (order.buyerId !== user.id) {
      return fail("You cannot pay for this order", 403);
    }
    if (order.status !== "PENDING_PAYMENT") {
      return fail("Order is not awaiting payment", 409);
    }

    const transaction = order.transactions[0];
    const paymentProvider = getPaymentProvider();
    const result = await paymentProvider.confirmIntent({
      providerIntentId: transaction?.providerIntentId
    });

    const updatedOrder = await prisma.$transaction(async (tx) => {
      if (transaction) {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { status: result.status }
        });
      }

      const nextOrderStatus = result.status === "SUCCEEDED" ? "PAID" : order.status;
      const saved = await tx.order.update({
        where: { id: order.id },
        data: { status: nextOrderStatus },
        include: { transactions: true, artwork: true, artist: true }
      });

      if (result.status === "SUCCEEDED" && order.artworkId) {
        await tx.artwork.update({
          where: { id: order.artworkId },
          data: { status: "SOLD" }
        });
      }

      return saved;
    });

    return ok({ order: updatedOrder });
  } catch (error) {
    return handleApiError(error);
  }
}
