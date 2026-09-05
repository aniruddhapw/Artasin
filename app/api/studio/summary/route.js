import { fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user?.artistProfile) {
      return fail("Artist account required", 403);
    }

    const artistId = user.artistProfile.id;
    const [orders, pendingRequests, activeOrders] = await Promise.all([
      prisma.order.findMany({
        where: { artistId },
        select: {
          subtotalCents: true,
          platformCommissionCents: true,
          artistPayoutCents: true,
          createdAt: true
        }
      }),
      prisma.commissionRequest.count({
        where: {
          artistId,
          status: { in: ["SUBMITTED", "ARTIST_REVIEW", "MEETING_REQUESTED", "QUOTED"] }
        }
      }),
      prisma.order.count({
        where: {
          artistId,
          status: { in: ["PAID", "IN_PROGRESS", "SHIPPED"] }
        }
      })
    ]);

    const totalRevenueCents = orders.reduce(
      (total, order) => total + order.subtotalCents,
      0
    );
    const nextPayoutCents = orders.reduce(
      (total, order) => total + order.artistPayoutCents,
      0
    );

    return ok({
      totalRevenueCents,
      pendingRequests,
      activeOrders,
      nextPayoutCents
    });
  } catch (error) {
    return handleApiError(error);
  }
}
