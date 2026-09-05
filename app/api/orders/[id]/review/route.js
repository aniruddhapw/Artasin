import { z } from "zod";
import { fail, handleApiError, created } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const reviewableStatuses = ["DELIVERED", "COMPLETED"];

const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().max(2000).optional()
});

export async function POST(request, context) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return fail("Authentication required", 401);
    }

    const { id } = await context.params;
    const input = createReviewSchema.parse(await request.json());

    const order = await prisma.order.findUnique({ where: { id }, include: { review: true } });
    if (!order) {
      return fail("Order not found", 404);
    }
    if (order.buyerId !== user.id) {
      return fail("You cannot review this order", 403);
    }
    if (!reviewableStatuses.includes(order.status)) {
      return fail("This order isn't eligible for a review yet", 409);
    }
    if (order.review) {
      return fail("You already reviewed this order", 409);
    }

    const review = await prisma.review.create({
      data: {
        orderId: order.id,
        buyerId: user.id,
        artistId: order.artistId,
        artworkId: order.artworkId,
        rating: input.rating,
        body: input.body || null
      }
    });

    return created({ review });
  } catch (error) {
    return handleApiError(error);
  }
}
