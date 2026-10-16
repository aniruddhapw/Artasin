import { adminNotificationEmails } from "@/lib/adminRecipients";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { orderRequestAdminEmail, orderRequestedBuyerEmail, type OrderRequestItem } from "@/lib/emails";
import { parseShippingAddress } from "@/lib/shippingAddress";
import { isNonEmpty } from "@/types/utils";

/**
 * Tells the Artasin team about new orders, and the buyer that they'll hear
 * back. Used while payment is taken directly (PAYMENT_PROVIDER offline): the
 * orders exist but nothing is paid or sold until an admin records the payment.
 *
 * One email each per checkout, however many pieces were in it. Never throws,
 * so a mail problem can't undo an order the buyer has already placed.
 */
export async function notifyOrdersRequested(orderIds: readonly string[]): Promise<void> {
  try {
    const orders = await prisma.order.findMany({
      where: { id: { in: [...orderIds] } },
      orderBy: { createdAt: "asc" },
      include: {
        buyer: { select: { firstName: true, lastName: true, email: true, phone: true } },
        artist: { select: { displayName: true, user: { select: { email: true, phone: true } } } },
        artwork: { select: { title: true } },
        commissionRequest: { select: { title: true } }
      }
    });
    const [first] = orders;
    if (!first) {
      return;
    }

    const items: OrderRequestItem[] = await Promise.all(
      orders.map(async (order) => ({
        orderId: order.id,
        title: order.artwork?.title || order.commissionRequest?.title || "Custom commission",
        artistName: order.artist.displayName,
        artistEmail: order.artist.user?.email,
        artistPhone: order.artist.user?.phone,
        priceCents: order.subtotalCents,
        shippingCents: order.shippingCents,
        taxCents: order.taxCents,
        buyerServiceFeeCents: order.buyerServiceFeeCents,
        currency: order.currency,
        commissionCents: order.platformCommissionCents,
        payoutCents: order.artistPayoutCents,
        otherOpenOrders: order.artworkId
          ? await prisma.order.count({
              where: { artworkId: order.artworkId, status: "PENDING_PAYMENT", id: { notIn: [...orderIds] } }
            })
          : 0
      }))
    );

    const { buyer, shippingAddress } = first;
    // There is at least one order, so at least one item.
    if (!isNonEmpty(items)) {
      return;
    }
    const nonEmptyItems = items;
    const recipients = await adminNotificationEmails();
    await Promise.all([
      ...recipients.map((to) =>
        sendEmail({ to, ...orderRequestAdminEmail(buyer, parseShippingAddress(shippingAddress), nonEmptyItems) })
      ),
      sendEmail({ to: buyer.email, ...orderRequestedBuyerEmail(buyer, nonEmptyItems) })
    ]);
  } catch (error) {
    console.error("Order request notification failed:", error);
  }
}
