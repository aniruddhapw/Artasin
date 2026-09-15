import { z } from "zod";
import { created, fail, handleApiError } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { prisma } from "@/lib/db";

const cartCheckoutSchema = z.object({
  shippingAddress: z.record(z.string(), z.any()).optional()
});

/**
 * An Order carries a single artistId and artworkId, because commission rates,
 * payouts and shipping are all per artist. Checking out a cart therefore creates
 * one order per piece rather than one order with line items.
 *
 * Payment intents are created per order by /api/orders/[id]/pay, which the
 * client calls for each order returned here. That is fine under the manual
 * provider; going live on Razorpay will want a single intent covering the whole
 * cart, which needs Order split into Order + OrderItem first.
 */
export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return fail("Authentication required", 401);
    }

    const input = cartCheckoutSchema.parse(await request.json());
    const { available } = await getCart(user.id);

    if (!available.length) {
      return fail("Your cart is empty", 409);
    }

    const orders = [];
    for (const item of available) {
      const artwork = item.artwork;

      // Re-check inside the loop: a piece can sell between opening checkout and
      // submitting it, and a unique original must not be sold twice.
      const fresh = await prisma.artwork.findUnique({
        where: { id: artwork.id },
        select: { status: true, priceCents: true, currency: true, artistId: true }
      });
      if (!fresh || fresh.status !== "PUBLISHED") {
        continue;
      }

      const profile = await prisma.artistProfile.findUnique({
        where: { id: fresh.artistId },
        select: { id: true, commissionRate: true }
      });
      const rate = Number(profile?.commissionRate ?? 15);
      const subtotalCents = fresh.priceCents;
      const platformCommissionCents = Math.round(subtotalCents * (rate / 100));

      const order = await prisma.order.create({
        data: {
          buyerId: user.id,
          artistId: fresh.artistId,
          artworkId: artwork.id,
          subtotalCents,
          shippingCents: 0,
          taxCents: 0,
          buyerServiceFeeCents: 0,
          platformCommissionCents,
          artistPayoutCents: subtotalCents - platformCommissionCents,
          currency: fresh.currency,
          shippingAddress: input.shippingAddress
        },
        select: { id: true, artworkId: true }
      });
      orders.push(order);
    }

    if (!orders.length) {
      return fail("Every piece in your cart has sold", 409);
    }

    // Only clear what actually became an order, so anything that sold mid-checkout
    // stays visible in the cart with its "no longer available" explanation.
    await prisma.cartItem.deleteMany({
      where: { userId: user.id, artworkId: { in: orders.map((order) => order.artworkId) } }
    });

    return created({ orders, skipped: available.length - orders.length });
  } catch (error) {
    return handleApiError(error);
  }
}
