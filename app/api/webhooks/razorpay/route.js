import { fail, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { orderConfirmedBuyerEmail, orderSoldArtistEmail } from "@/lib/emails";
import { verifyRazorpayWebhook } from "@/lib/payments";

/**
 * Safety net for the browser-side confirmation in /api/orders/[id]/pay.
 * If the buyer pays and then closes the tab before the redirect, this is what
 * still marks the order paid.
 */
export async function POST(request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyRazorpayWebhook(rawBody, signature)) {
    return fail("Invalid webhook signature", 401);
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return fail("Invalid webhook payload", 400);
  }

  const payment = event?.payload?.payment?.entity;
  if (!payment?.order_id) {
    return ok({ received: true });
  }

  const transaction = await prisma.transaction.findFirst({
    where: { providerIntentId: payment.order_id },
    include: {
      order: {
        include: {
          buyer: { select: { email: true, firstName: true, lastName: true } },
          artist: { include: { user: { select: { email: true } } } },
          artwork: { select: { title: true } },
          commissionRequest: { select: { title: true } }
        }
      }
    }
  });

  if (!transaction) {
    // Not an order we know about — acknowledge so Razorpay stops retrying.
    return ok({ received: true });
  }

  const { order } = transaction;

  if (event.event === "payment.failed") {
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "FAILED", rawPayload: payment }
    });
    return ok({ received: true });
  }

  if (event.event !== "payment.captured" && event.event !== "payment.authorized") {
    return ok({ received: true });
  }

  // Already handled by the browser-side confirmation — nothing left to do.
  if (order.status !== "PENDING_PAYMENT") {
    return ok({ received: true, alreadyProcessed: true });
  }

  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: transaction.id },
      data: { status: "SUCCEEDED", rawPayload: payment }
    });
    await tx.order.update({ where: { id: order.id }, data: { status: "PAID" } });
    if (order.artworkId) {
      await tx.artwork.update({ where: { id: order.artworkId }, data: { status: "SOLD" } });
    }
  });

  const itemTitle = order.artwork?.title || order.commissionRequest?.title || "your commission";
  const paidOrder = { ...order, status: "PAID" };
  await Promise.all([
    sendEmail({ to: order.buyer.email, ...orderConfirmedBuyerEmail(paidOrder, itemTitle) }),
    order.artist.user?.email
      ? sendEmail({
          to: order.artist.user.email,
          ...orderSoldArtistEmail(paidOrder, itemTitle, `${order.buyer.firstName} ${order.buyer.lastName}`)
        })
      : null
  ]);

  return ok({ received: true });
}
