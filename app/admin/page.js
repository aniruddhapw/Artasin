import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/db";
import { serializeMoney } from "@/lib/api";

export const metadata = {
  title: "Admin Dashboard"
};

const settledStatuses = ["PAID", "IN_PROGRESS", "SHIPPED", "DELIVERED", "COMPLETED"];

export default async function AdminDashboardPage() {
  const [settledOrders, disputedCount, artistCount, buyerCount, recentOrders] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: settledStatuses } },
      select: { subtotalCents: true, shippingCents: true, taxCents: true, platformCommissionCents: true }
    }),
    prisma.order.count({ where: { status: "DISPUTED" } }),
    prisma.artistProfile.count(),
    prisma.user.count({ where: { role: "BUYER" } }),
    prisma.order.findMany({
      include: {
        artist: { select: { displayName: true } },
        buyer: { select: { firstName: true, lastName: true } },
        artwork: { select: { title: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 8
    })
  ]);

  const gmvCents = settledOrders.reduce(
    (total, order) => total + order.subtotalCents + order.shippingCents + order.taxCents,
    0
  );
  const commissionRevenueCents = settledOrders.reduce(
    (total, order) => total + order.platformCommissionCents,
    0
  );

  return (
    <>
      <Nav active="collections" />
      <main className="page studio-page">
        <header className="studio-header studio-header-row">
          <div>
            <h1>Admin Dashboard</h1>
            <p>Platform-wide gross merchandise value, commission revenue, and marketplace health.</p>
          </div>
          <div className="studio-header-actions">
            <Link className="button button-secondary" href="/admin/artworks">
              Moderate Listings
            </Link>
            <Link className="button button-primary" href="/admin/artists">
              Artists &amp; Payouts
            </Link>
          </div>
        </header>

        <div className="kpi-grid admin-kpi-grid">
          <Kpi caption={`${settledOrders.length} settled orders`} title="Gross Merchandise Value" value={serializeMoney(gmvCents).formatted} />
          <Kpi caption="Platform earnings" title="Commission Revenue" value={serializeMoney(commissionRevenueCents).formatted} />
          <Kpi caption="Verified studio accounts" href="/admin/artists" title="Artists" value={String(artistCount)} />
          <Kpi caption="Registered collectors" title="Buyers" value={String(buyerCount)} />
          <Kpi
            caption={disputedCount ? "Needs attention" : "All clear"}
            href="/admin/disputes"
            title="Disputes"
            value={String(disputedCount)}
          />
        </div>

        <article className="dashboard-card list-card admin-recent-orders">
          <div className="card-heading">
            <h2>Recent Transactions</h2>
          </div>
          <div className="order-history-list">
            {recentOrders.map((order) => (
              <div className="order-history-row" key={order.id}>
                <div className="order-history-details">
                  <h3>{order.artwork?.title || "Custom Commission"}</h3>
                  <p>
                    {order.buyer.firstName} {order.buyer.lastName} → {order.artist.displayName}
                  </p>
                </div>
                <div className="order-history-meta">
                  <strong>
                    {serializeMoney(order.subtotalCents + order.shippingCents + order.taxCents, order.currency).formatted}
                  </strong>
                  <span className="tag">{order.status.replace(/_/g, " ")}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </main>
      <Footer variant="simple" />
    </>
  );
}

function Kpi({ title, value, caption, href }) {
  const content = (
    <>
      <h2>{title}</h2>
      <div>
        <strong>{value}</strong>
        <p>{caption}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <Link className="dashboard-card kpi kpi-link" href={href}>
        {content}
      </Link>
    );
  }

  return <article className="dashboard-card kpi">{content}</article>;
}
