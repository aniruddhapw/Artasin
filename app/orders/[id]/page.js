import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DisputeAction } from "@/components/orders/DisputeAction";
import { ReviewAction } from "@/components/orders/ReviewAction";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeMoney } from "@/lib/api";

export const metadata = {
  title: "Order Confirmation"
};

const statusLabels = {
  PENDING_PAYMENT: "Awaiting Payment",
  PAID: "Paid",
  IN_PROGRESS: "In Progress",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  DISPUTED: "Disputed"
};

export default async function OrderDetailPage({ params }) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) {
    redirect(`/login?redirect=/orders/${id}`);
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      artwork: { include: { media: { take: 1, orderBy: { sortOrder: "asc" } } } },
      artist: { select: { displayName: true, slug: true } },
      commissionRequest: { select: { title: true } },
      review: true
    }
  });

  if (!order) {
    notFound();
  }

  const isOwner = order.buyerId === user.id;
  const isArtist = user.artistProfile && order.artistId === user.artistProfile.id;
  if (!isOwner && !isArtist && user.role !== "ADMIN") {
    notFound();
  }

  const totalCents = order.subtotalCents + order.shippingCents + order.taxCents + order.buyerServiceFeeCents;
  const shippingAddress = order.shippingAddress;

  return (
    <>
      <Nav active="collections" />
      <main className="page request-page">
        <div className="order-confirmation">
          <div>
            <p className="tag">{statusLabels[order.status] || order.status}</p>
            <h1>{order.status === "PAID" ? "Order Confirmed" : "Order Placed"}</h1>
            <p>
              {order.artwork ? (
                <>
                  <Link href={`/artwork/${order.artwork.slug}`}>{order.artwork.title}</Link> by{" "}
                  {order.artist.displayName}
                </>
              ) : (
                order.commissionRequest?.title || "Custom Commission"
              )}
            </p>
          </div>

          <p className="price">{serializeMoney(totalCents, order.currency).formatted}</p>

          <dl className="order-confirmation-detail-list">
            <div>
              <dt>Order Number</dt>
              <dd>#{order.id.slice(-8).toUpperCase()}</dd>
            </div>
            <div>
              <dt>Item Price</dt>
              <dd>{serializeMoney(order.subtotalCents, order.currency).formatted}</dd>
            </div>
            <div>
              <dt>Shipping</dt>
              <dd>{serializeMoney(order.shippingCents, order.currency).formatted}</dd>
            </div>
            <div>
              <dt>Tax</dt>
              <dd>{serializeMoney(order.taxCents, order.currency).formatted}</dd>
            </div>
            {shippingAddress ? (
              <div>
                <dt>Ships To</dt>
                <dd>
                  {shippingAddress.fullName}
                  <br />
                  {shippingAddress.addressLine1}
                  {shippingAddress.addressLine2 ? <>, {shippingAddress.addressLine2}</> : null}
                  <br />
                  {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
                  <br />
                  {shippingAddress.country}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="order-confirmation-actions">
            <Link className="button button-secondary" href="/orders">
              View All Orders
            </Link>
            <DisputeAction orderId={order.id} status={order.status} />
          </div>

          {isOwner ? (
            <div className="order-review-section">
              <ReviewAction orderId={order.id} review={order.review} status={order.status} />
            </div>
          ) : null}
        </div>
      </main>
      <Footer variant="simple" />
    </>
  );
}
