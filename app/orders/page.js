import Link from "next/link";
import { redirect } from "next/navigation";
import { Footer } from "@/components/Footer";
import { LazyImage } from "@/components/LazyImage";
import { Nav } from "@/components/Nav";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { thumbUrl } from "@/lib/images";
import { serializeMoney } from "@/lib/api";

export const metadata = {
  title: "Order History"
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

export default async function OrdersPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login?redirect=/orders");
  }

  const orders = await prisma.order.findMany({
    where:
      user.role === "ARTIST" && user.artistProfile
        ? { artistId: user.artistProfile.id }
        : { buyerId: user.id },
    include: {
      artwork: { include: { media: { take: 1, orderBy: { sortOrder: "asc" } } } },
      artist: { select: { displayName: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <>
      <Nav active="collections" />
      <main className="page request-page">
        <header className="request-header">
          <h1>Order History</h1>
          <p>
            {user.role === "ARTIST"
              ? "Every sale made through your studio, with current fulfillment status."
              : "Your acquisitions and their current fulfillment status."}
          </p>
        </header>

        {orders.length ? (
          <div className="order-history-list">
            {orders.map((order) => (
              <Link className="order-history-row" href={`/orders/${order.id}`} key={order.id}>
                <div className="order-history-image">
                  <LazyImage
                    alt={order.artwork?.title || "Commission order"}
                    src={thumbUrl(order.artwork?.media[0]?.url) || "/artisan/artwork-placeholder.svg"}
                  />
                </div>
                <div className="order-history-details">
                  <h3>{order.artwork?.title || "Custom Commission"}</h3>
                  <p>
                    {user.role === "ARTIST" ? "Buyer order" : order.artist.displayName} · Order #
                    {order.id.slice(-8).toUpperCase()}
                  </p>
                </div>
                <div className="order-history-meta">
                  <strong>
                    {serializeMoney(
                      order.subtotalCents + order.shippingCents + order.taxCents + order.buyerServiceFeeCents,
                      order.currency
                    ).formatted}
                  </strong>
                  <span className="tag">{statusLabels[order.status] || order.status}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-state">
            No orders yet. <Link href="/gallery">Browse the collection</Link> to make your first acquisition.
          </p>
        )}
      </main>
      <Footer variant="simple" />
    </>
  );
}
