import { prisma } from "@/lib/db";

/**
 * A cart of unique originals needs pruning on every read: a piece can sell,
 * be unpublished, or be archived while it sits in someone's cart. Rather than
 * show a stale row, unavailable items are reported separately so the cart page
 * can say what happened.
 */
export async function getCart(userId) {
  const items = await prisma.cartItem.findMany({
    where: { userId },
    include: {
      artwork: {
        include: {
          artist: { select: { id: true, displayName: true, slug: true } },
          media: { take: 1, orderBy: { sortOrder: "asc" } }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const available = items.filter((item) => item.artwork.status === "PUBLISHED");
  const unavailable = items.filter((item) => item.artwork.status !== "PUBLISHED");
  const subtotalCents = available.reduce((total, item) => total + item.artwork.priceCents, 0);

  return { items, available, unavailable, subtotalCents, count: available.length };
}

export async function getCartCount(userId) {
  if (!userId) {
    return 0;
  }
  return prisma.cartItem.count({
    where: { userId, artwork: { status: "PUBLISHED" } }
  });
}
