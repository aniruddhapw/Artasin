import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { OrderRequestActions } from "@/components/admin/OrderRequestActions";
import { serializeMoney } from "@/lib/api";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Order Requests"
};

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/**
 * Orders waiting for payment. While payment is taken directly, this is where
 * an order ends once the money has arrived: mark it paid and the piece is
 * sold and the buyer and artist are told.
 */
export default async function AdminOrderRequestsPage() {
  const orders = await prisma.order.findMany({
    where: { status: "PENDING_PAYMENT" },
    include: {
      artwork: { select: { title: true, slug: true, status: true } },
      commissionRequest: { select: { title: true } },
      buyer: { select: { firstName: true, lastName: true, email: true, phone: true } },
      artist: { select: { displayName: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <>
      <Nav />
      <main className="page request-page">
        <header className="request-header studio-header-row">
          <div>
            <h1>Order Requests</h1>
            <p>
              Orders waiting for payment. Contact the buyer, take payment, then mark the order as paid. The piece is
              marked sold and the buyer and artist are emailed.
            </p>
          </div>
          <div className="studio-header-actions">
            <Link className="button button-secondary" href="/admin">
              Dashboard
            </Link>
          </div>
        </header>

        {orders.length ? (
          <div className="order-history-list">
            {orders.map((order) => {
              const address = order.shippingAddress || {};
              const totalCents = order.subtotalCents + order.shippingCents + order.taxCents + order.buyerServiceFeeCents;
              const unavailable = order.artwork && order.artwork.status !== "PUBLISHED";
              return (
                <div className="order-history-row dispute-row" key={order.id}>
                  <div className="order-history-details">
                    <Link href={`/orders/${order.id}`}>
                      <h3>{order.artwork?.title || order.commissionRequest?.title || "Custom Commission"}</h3>
                    </Link>
                    <p>
                      {order.buyer.firstName} {order.buyer.lastName} · {order.buyer.email}
                      {order.buyer.phone ? ` · ${order.buyer.phone}` : ""}
                    </p>
                    <p>
                      Artist: {order.artist.displayName} · Placed {dateFormat.format(order.createdAt)}
                    </p>
                    <p>
                      {[address.addressLine1, address.addressLine2, address.city, address.state, address.postalCode, address.country]
                        .filter(Boolean)
                        .join(", ") || "No address given"}
                    </p>
                    {unavailable ? (
                      <p className="auth-error auth-error-inline">
                        This piece is no longer for sale ({order.artwork.status.toLowerCase()}), so this order can only be
                        cancelled.
                      </p>
                    ) : null}
                  </div>
                  <div className="order-history-meta">
                    <strong>{serializeMoney(totalCents, order.currency).formatted}</strong>
                    <OrderRequestActions canMarkPaid={!unavailable} orderId={order.id} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="empty-state">No orders are waiting for payment.</p>
        )}
      </main>
      <Footer variant="simple" />
    </>
  );
}
