import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { DisputeResolveActions } from "@/components/admin/DisputeResolveActions";
import { prisma } from "@/lib/db";
import { serializeMoney } from "@/lib/api";

export const metadata = {
  title: "Disputes"
};

export default async function AdminDisputesPage() {
  const orders = await prisma.order.findMany({
    where: { status: "DISPUTED" },
    include: {
      artwork: { select: { title: true } },
      commissionRequest: { select: { title: true } },
      buyer: { select: { firstName: true, lastName: true, email: true } },
      artist: { select: { displayName: true } }
    },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <>
      <Nav active="collections" />
      <main className="page request-page">
        <header className="request-header">
          <h1>Disputes</h1>
          <p>Orders flagged by a buyer or artist for admin review.</p>
        </header>

        {orders.length ? (
          <div className="order-history-list">
            {orders.map((order) => (
              <div className="order-history-row dispute-row" key={order.id}>
                <div className="order-history-details">
                  <Link href={`/orders/${order.id}`}>
                    <h3>{order.artwork?.title || order.commissionRequest?.title || "Custom Commission"}</h3>
                  </Link>
                  <p>
                    {order.buyer.firstName} {order.buyer.lastName} ({order.buyer.email}) ·{" "}
                    {order.artist.displayName}
                  </p>
                </div>
                <div className="order-history-meta">
                  <strong>
                    {serializeMoney(
                      order.subtotalCents + order.shippingCents + order.taxCents,
                      order.currency
                    ).formatted}
                  </strong>
                  <DisputeResolveActions orderId={order.id} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No open disputes.</p>
        )}
      </main>
      <Footer variant="simple" />
    </>
  );
}
