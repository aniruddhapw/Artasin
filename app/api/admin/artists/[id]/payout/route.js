import { created, fail, handleApiError } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request, context) {
  try {
    const user = await getAuthUser(request);
    if (user?.role !== "ADMIN") {
      return fail("Admin access required", 403);
    }

    const { id } = await context.params;
    const orders = await prisma.order.findMany({
      where: { artistId: id, status: { notIn: ["PENDING_PAYMENT", "CANCELLED"] } },
      select: { artistPayoutCents: true }
    });
    const payouts = await prisma.payout.findMany({ where: { artistId: id }, select: { amountCents: true } });

    const earnedCents = orders.reduce((total, order) => total + order.artistPayoutCents, 0);
    const paidCents = payouts.reduce((total, payout) => total + payout.amountCents, 0);
    const owedCents = earnedCents - paidCents;

    if (owedCents <= 0) {
      return fail("No outstanding balance for this artist", 409);
    }

    const payout = await prisma.payout.create({
      data: {
        artistId: id,
        amountCents: owedCents,
        provider: "manual",
        status: "PAID"
      }
    });

    return created({ payout });
  } catch (error) {
    return handleApiError(error);
  }
}
