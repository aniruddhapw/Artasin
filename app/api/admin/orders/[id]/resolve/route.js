import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const resolveSchema = z.object({
  resolution: z.enum(["refund", "dismiss"])
});

export async function POST(request, context) {
  try {
    const user = await getAuthUser(request);
    if (user?.role !== "ADMIN") {
      return fail("Admin access required", 403);
    }

    const { id } = await context.params;
    const input = resolveSchema.parse(await request.json());

    const order = await prisma.order.findUnique({ where: { id }, include: { transactions: true } });
    if (!order) {
      return fail("Order not found", 404);
    }
    if (order.status !== "DISPUTED") {
      return fail("Only disputed orders can be resolved", 409);
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (input.resolution === "refund") {
        await tx.transaction.updateMany({
          where: { orderId: order.id },
          data: { status: "REFUNDED" }
        });
        if (order.artworkId) {
          await tx.artwork.update({
            where: { id: order.artworkId },
            data: { status: "PUBLISHED" }
          });
        }
        return tx.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });
      }
      return tx.order.update({ where: { id: order.id }, data: { status: "COMPLETED" } });
    });

    return ok({ order: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
