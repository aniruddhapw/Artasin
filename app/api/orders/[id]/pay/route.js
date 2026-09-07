import { fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { orderConfirmedBuyerEmail, orderSoldArtistEmail } from "@/lib/emails";
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

    const body = await request.json().catch(() => ({}));
    const transaction = order.transactions[0];
    const paymentProvider = getPaymentProvider();

    let result;
    try {
      result = await paymentProvider.confirmIntent({
        providerIntentId: transaction?.providerIntentId,
        paymentId: body.razorpay_payment_id,
        signature: body.razorpay_signature
      });
    } catch (confirmError) {
      // A failed verification must never leave the order looking payable.
      if (transaction) {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: "FAILED" }
        });
      }
      return fail(confirmError.message, 402);
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      if (transaction) {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: result.status,
            // providerIntentId stays the provider's *order* id — the webhook
            // looks the transaction up by it. The payment id lives in the payload.
            rawPayload: result.rawPayload ?? undefined
          }
        });
      }

      const nextOrderStatus = result.status === "SUCCEEDED" ? "PAID" : order.status;
      const saved = await tx.order.update({
        where: { id: order.id },
        data: { status: nextOrderStatus },
        include: {
          transactions: true,
          artwork: true,
          artist: { include: { user: { select: { email: true } } } },
          commissionRequest: { select: { title: true } }
        }
      });

      if (result.status === "SUCCEEDED" && order.artworkId) {
        await tx.artwork.update({
          where: { id: order.artworkId },
          data: { status: "SOLD" }
        });
      }

      return saved;
    });

    if (updatedOrder.status === "PAID") {
      const itemTitle = updatedOrder.artwork?.title || updatedOrder.commissionRequest?.title || "your commission";
      await Promise.all([
        sendEmail({ to: user.email, ...orderConfirmedBuyerEmail(updatedOrder, itemTitle) }),
        updatedOrder.artist.user?.email
          ? sendEmail({
              to: updatedOrder.artist.user.email,
              ...orderSoldArtistEmail(updatedOrder, itemTitle, `${user.firstName} ${user.lastName}`)
            })
          : null
      ]);
    }

    return ok({ order: updatedOrder });
  } catch (error) {
    return handleApiError(error);
  }
}
