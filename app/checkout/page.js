import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeMoney } from "@/lib/api";

export const metadata = {
  title: "Checkout"
};

export default async function CheckoutPage({ searchParams }) {
  const params = await searchParams;
  const artworkId = typeof params?.artworkId === "string" ? params.artworkId : undefined;
  const commissionRequestId =
    typeof params?.commissionRequestId === "string" ? params.commissionRequestId : undefined;

  if (!artworkId && !commissionRequestId) {
    redirect("/gallery");
  }

  const user = await getAuthUser();
  if (!user) {
    const target = artworkId
      ? `/checkout?artworkId=${artworkId}`
      : `/checkout?commissionRequestId=${commissionRequestId}`;
    redirect(`/login?redirect=${encodeURIComponent(target)}`);
  }

  let summary = null;

  if (artworkId) {
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
      image: artwork.media[0]?.url || "/artisan/artwork-placeholder.svg",
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
          </div>

          <CheckoutForm
            artworkId={artworkId}
            commissionRequestId={commissionRequestId}
            defaultEmail={user.email}
          />
        </section>
      </main>
      <Footer variant="simple" />
    </>
  );
}
