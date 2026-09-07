import { z } from "zod";
import { created, fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPaymentProvider, getPlatformCommissionRate } from "@/lib/payments";

const orderSchema = z.object({
  artworkId: z.string().optional(),
  commissionRequestId: z.string().optional(),
  shippingCents: z.number().int().min(0).default(0),
  taxCents: z.number().int().min(0).default(0),
  buyerServiceFeeCents: z.number().int().min(0).default(0),
  shippingAddress: z.record(z.string(), z.any()).optional()
});

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return fail("Authentication required", 401);
    }

    const orders = await prisma.order.findMany({
      where:
        user.role === "ARTIST" && user.artistProfile
          ? { artistId: user.artistProfile.id }
          : { buyerId: user.id },
      include: {
        artwork: { include: { media: { take: 1, orderBy: { sortOrder: "asc" } } } },
        artist: { select: { displayName: true, slug: true } },
        transactions: true
      },
      orderBy: { createdAt: "desc" }
    });

    return ok({ orders });
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

    const input = orderSchema.parse(await request.json());
    if (!input.artworkId && !input.commissionRequestId) {
      return fail("artworkId or commissionRequestId is required", 422);
    }

    const orderSource = input.artworkId
      ? await getArtworkOrderSource(input.artworkId)
      : await getCommissionOrderSource(input.commissionRequestId, user.id);

    if (!orderSource) {
      return fail("Order source not found", 404);
    }

    const commissionRate = getPlatformCommissionRate(orderSource.artist.commissionRate);
    const subtotalCents = orderSource.priceCents;
    const platformCommissionCents = Math.round(subtotalCents * (commissionRate / 100));
    const artistPayoutCents = subtotalCents - platformCommissionCents;
    const totalCents =
      subtotalCents + input.shippingCents + input.taxCents + input.buyerServiceFeeCents;

    const paymentProvider = getPaymentProvider();
    const intent = await paymentProvider.createIntent({
      amountCents: totalCents,
      currency: orderSource.currency,
      receipt: `artisan_${Date.now()}`,
      notes: {
        buyerEmail: user.email,
        artist: orderSource.artist.displayName,
        item: input.artworkId ? "artwork" : "commission"
      }
    });

    const order = await prisma.order.create({
      data: {
        buyerId: user.id,
        artistId: orderSource.artist.id,
        artworkId: input.artworkId,
        commissionRequestId: input.commissionRequestId,
        subtotalCents,
        shippingCents: input.shippingCents,
        taxCents: input.taxCents,
        buyerServiceFeeCents: input.buyerServiceFeeCents,
        platformCommissionCents,
        artistPayoutCents,
        currency: orderSource.currency,
        shippingAddress: input.shippingAddress,
        transactions: {
          create: {
            provider: intent.provider,
            providerIntentId: intent.providerIntentId,
            amountCents: totalCents,
            currency: orderSource.currency,
            status: intent.status
          }
        }
      },
      include: { transactions: true, artist: true, artwork: true, commissionRequest: true }
    });

    if (input.commissionRequestId) {
      await prisma.commissionRequest.update({
        where: { id: input.commissionRequestId },
        data: { status: "ACCEPTED" }
      });
    }

    // Everything the browser needs to open the provider's checkout. The key
    // here is the publishable key id, never the secret.
    return created({
      order,
      payment: {
        provider: paymentProvider.name,
        intentId: intent.providerIntentId,
        amountCents: totalCents,
        currency: orderSource.currency,
        clientKey: paymentProvider.clientKey()
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function getArtworkOrderSource(artworkId) {
  const artwork = await prisma.artwork.findUnique({
    where: { id: artworkId },
    include: { artist: true }
  });
  if (!artwork || artwork.status !== "PUBLISHED") {
    return null;
  }
  return {
    priceCents: artwork.priceCents,
    currency: artwork.currency,
    artist: artwork.artist
  };
}

async function getCommissionOrderSource(commissionRequestId, buyerId) {
  const commissionRequest = await prisma.commissionRequest.findUnique({
    where: { id: commissionRequestId },
    include: { artist: true }
  });
  if (
    !commissionRequest?.artist ||
    !commissionRequest.quotedPriceCents ||
    commissionRequest.buyerId !== buyerId ||
    commissionRequest.status !== "QUOTED"
  ) {
    return null;
  }
  return {
    priceCents: commissionRequest.quotedPriceCents,
    currency: commissionRequest.currency,
    artist: commissionRequest.artist
  };
}
