import { z } from "zod";
import { created, fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { prisma } from "@/lib/db";

const addToCartSchema = z.object({ artworkId: z.string().min(1) });

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return fail("Authentication required", 401);
    }
    const cart = await getCart(user.id);
    return ok({ count: cart.count, subtotalCents: cart.subtotalCents });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return fail("Authentication required", 401);
    }

    const { artworkId } = addToCartSchema.parse(await request.json());

    const artwork = await prisma.artwork.findUnique({
      where: { id: artworkId },
      select: { id: true, status: true, artist: { select: { userId: true } } }
    });
    if (!artwork) {
      return fail("Artwork not found", 404);
    }
    if (artwork.status !== "PUBLISHED") {
      return fail("This piece is no longer available", 409);
    }
    if (artwork.artist.userId === user.id) {
      return fail("You cannot buy your own work", 409);
    }

    // The unique constraint makes adding twice a no-op rather than an error;
    // clicking Add on a piece already in the cart should not look like a failure.
    await prisma.cartItem.upsert({
      where: { userId_artworkId: { userId: user.id, artworkId } },
      create: { userId: user.id, artworkId },
      update: {}
    });

    const cart = await getCart(user.id);
    return created({ count: cart.count });
  } catch (error) {
    return handleApiError(error);
  }
}
