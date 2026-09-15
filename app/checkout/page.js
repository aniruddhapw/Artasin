import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { getAuthUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { prisma } from "@/lib/db";
import { thumbUrl } from "@/lib/images";
import { serializeMoney } from "@/lib/api";

export const metadata = {
  title: "Checkout"
};

export default async function CheckoutPage({ searchParams }) {
  const params = await searchParams;
  const fromCart = params?.fromCart === "1";
  const artworkId = typeof params?.artworkId === "string" ? params.artworkId : undefined;
  const commissionRequestId =
    typeof params?.commissionRequestId === "string" ? params.commissionRequestId : undefined;

  if (!fromCart && !artworkId && !commissionRequestId) {
    redirect("/gallery");
  }

  const user = await getAuthUser();
  if (!user) {
    const target = fromCart
      ? "/checkout?fromCart=1"
      : artworkId
      ? `/checkout?artworkId=${artworkId}`
      : `/checkout?commissionRequestId=${commissionRequestId}`;
    redirect(`/login?redirect=${encodeURIComponent(target)}`);
  }

  let summary = null;
  let cartSummary = null;

  if (fromCart) {
    const cart = await getCart(user.id);
    if (!cart.available.length) {
      redirect("/cart");
    }
    cartSummary = cart;
  } else if (artworkId) {
    const artwork = await prisma.artwork.findUnique({
      where: { id: artworkId },
      include: {
        artist: { select: { displayName: true, slug: true } },
        media: { take: 1, orderBy: { sortOrder: "asc" } }
      }
    });
    if (!artwork || artwork.status !== "PUBLISHED") {
      notFound();
    }
    summary = {
      title: artwork.title,
      artistName: artwork.artist.displayName,
      artistHref: `/artist/${artwork.artist.slug}`,
      image: thumbUrl(artwork.media[0]?.url) || "/artisan/artwork-placeholder.svg",
      price: serializeMoney(artwork.priceCents, artwork.currency)
    };
  } else {
    const commissionRequest = await prisma.commissionRequest.findUnique({
      where: { id: commissionRequestId },
      include: { artist: { select: { displayName: true, slug: true } } }
    });
    if (
      !commissionRequest ||
      commissionRequest.buyerId !== user.id ||
      commissionRequest.status !== "QUOTED" ||
      !commissionRequest.quotedPriceCents
    ) {
      notFound();
    }
    summary = {
      title: commissionRequest.title,
      artistName: commissionRequest.artist.displayName,
      artistHref: `/artist/${commissionRequest.artist.slug}`,
      image: "/artisan/artwork-placeholder.svg",
      price: serializeMoney(commissionRequest.quotedPriceCents, commissionRequest.currency)
    };
  }

  return (
    <>
      <Nav active="collections" />
      <main className="page request-page">
        <header className="request-header">
          <h1>Checkout</h1>
          <p>Confirm your shipping details to complete this acquisition.</p>
        </header>

        <section className="request-layout">
          <div className="process-column">
            <h2>Order Summary</h2>
            {cartSummary ? (
              <>
                {cartSummary.available.map((item) => (
                  <div className="checkout-summary" key={item.id}>
                    <div className="checkout-summary-image">
                      <img
                        alt={`${item.artwork.title} artwork`}
                        src={thumbUrl(item.artwork.media[0]?.url) || "/artisan/artwork-placeholder.svg"}
                      />
                    </div>
                    <div>
                      <h3>{item.artwork.title}</h3>
                      <p className="byline">
                        by <Link href={`/artist/${item.artwork.artist.slug}`}>{item.artwork.artist.displayName}</Link>
                      </p>
                      <p className="price">
                        {serializeMoney(item.artwork.priceCents, item.artwork.currency).formatted}
                      </p>
                    </div>
                  </div>
                ))}
                <p className="price checkout-cart-total">
                  {serializeMoney(cartSummary.subtotalCents).formatted}
                </p>
              </>
            ) : (
              <div className="checkout-summary">
                <div className="checkout-summary-image">
                  <img alt={`${summary.title} artwork`} src={summary.image} />
                </div>
                <div>
                  <h3>{summary.title}</h3>
                  <p className="byline">
                    by <Link href={summary.artistHref}>{summary.artistName}</Link>
                  </p>
                  <p className="price">{summary.price.formatted}</p>
                </div>
              </div>
            )}
          </div>

          <CheckoutForm
            artworkId={artworkId}
            commissionRequestId={commissionRequestId}
            defaultEmail={user.email}
            fromCart={fromCart}
          />
        </section>
      </main>
      <Footer variant="simple" />
    </>
  );
}
