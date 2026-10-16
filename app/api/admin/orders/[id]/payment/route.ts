import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { orderConfirmedBuyerEmail, orderSoldArtistEmail } from "@/lib/emails";

const schema = z.object({
  action: z.enum(["markPaid", "cancel"])
});

/**
 * Closes out an order that was taken as a request (payment arranged directly
 * with the buyer). Marking it paid does what a successful online payment does:
 * the order is paid, the piece is sold, and the buyer and artist are told.
 */
export async function POST(request: Request, context: RouteContext<"/api/admin/orders/[id]/payment">) {
  try {
    const admin = await getAuthUser(request);
    if (admin?.role !== "ADMIN") {
      return fail("Admin access required", 403);
    }

    const { id } = await context.params;
    const { action } = schema.parse(await request.json());

    const order = await prisma.order.findUnique({ where: { id }, include: { transactions: true } });
    if (!order) {
      return fail("Order not found", 404);
    }
    if (order.status !== "PENDING_PAYMENT") {
      return fail("This order isn't waiting for payment", 409);
    }

    if (action === "cancel") {
      await prisma.$transaction([
        prisma.order.update({ where: { id }, data: { status: "CANCELLED" } }),
        prisma.transaction.updateMany({
          where: { orderId: id, status: "REQUIRES_PAYMENT" },
          data: { status: "FAILED" }
        })
      ]);
      return ok({ status: "CANCELLED" });
    }

    const totalCents = order.subtotalCents + order.shippingCents + order.taxCents + order.buyerServiceFeeCents;
    const paid = await prisma.$transaction(async (tx) => {
      // A unique original can only be sold once, so the piece has to still be
      // for sale. The conditional update is what makes two admins, or two open
      // orders, unable to both succeed.
      if (order.artworkId) {
        const sold = await tx.artwork.updateMany({
          where: { id: order.artworkId, status: "PUBLISHED" },
          data: { status: "SOLD" }
        });
        if (sold.count !== 1) {
          return null;
        }
      }

      const existing = order.transactions[0];
      const note = { recordedBy: admin.id, note: "Paid directly to Artasin" };
      if (existing) {
        await tx.transaction.update({ where: { id: existing.id }, data: { status: "SUCCEEDED", rawPayload: note } });
      } else {
        await tx.transaction.create({
          data: {
            orderId: id,
            provider: "offline",
            providerIntentId: `offline_${id}`,
            amountCents: totalCents,
            currency: order.currency,
            status: "SUCCEEDED",
            rawPayload: note
          }
        });
      }

      return tx.order.update({
        where: { id },
        data: { status: "PAID" },
        include: {
          buyer: { select: { email: true, firstName: true, lastName: true } },
          artwork: { select: { title: true } },
          commissionRequest: { select: { title: true } },
          artist: { include: { user: { select: { email: true } } } }
        }
      });
    });

    if (!paid) {
      return fail("This piece has already sold or is no longer listed. Cancel this order instead.", 409);
    }

    const itemTitle = paid.artwork?.title || paid.commissionRequest?.title || "your commission";
    await Promise.all([
      sendEmail({ to: paid.buyer.email, ...orderConfirmedBuyerEmail(paid, itemTitle) }),
      paid.artist.user?.email
        ? sendEmail({
            to: paid.artist.user.email,
            ...orderSoldArtistEmail(paid, itemTitle, `${paid.buyer.firstName} ${paid.buyer.lastName}`)
          })
        : null
    ]);

    return ok({ status: "PAID" });
  } catch (error) {
    return handleApiError(error);
  }
}
