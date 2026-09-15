import { fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { prisma } from "@/lib/db";

export async function DELETE(request, context) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return fail("Authentication required", 401);
    }
    const { artworkId } = await context.params;

    await prisma.cartItem.deleteMany({ where: { userId: user.id, artworkId } });

    const cart = await getCart(user.id);
    return ok({ count: cart.count });
  } catch (error) {
    return handleApiError(error);
  }
}
