import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { Nav } from "@/components/Nav";
import { OrderShipAction } from "@/components/studio/OrderShipAction";
import { VerificationBanner } from "@/components/studio/VerificationBanner";
import { YearSelector } from "@/components/studio/YearSelector";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeMoney } from "@/lib/api";

export const metadata = {
  title: "Studio Dashboard"
};

const requestIconByType = {
  Painting: "palette",
  Sculpture: "architecture",
  "Digital Art": "image",
  Photography: "image"
};

const activeOrderStatuses = ["PAID", "IN_PROGRESS", "SHIPPED"];
const pendingRequestStatuses = ["SUBMITTED", "ARTIST_REVIEW", "MEETING_REQUESTED", "QUOTED"];
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function StudioPage({ searchParams }) {
  const params = await searchParams;
  const user = await getAuthUser();
  const artistId = user.artistProfile.id;
  const currentYear = new Date().getFullYear();
  const requestedYear = Number(params?.year);
  const selectedYear =
    Number.isInteger(requestedYear) && requestedYear >= currentYear - 1 && requestedYear <= currentYear
      ? requestedYear
      : currentYear;
  const yearStart = new Date(selectedYear, 0, 1);
  const yearEnd = new Date(selectedYear + 1, 0, 1);

  const [orders, pendingRequestsCount, activeOrdersCount, pendingRequests, activeOrders, yearOrders, payouts] =
    await Promise.all([
      prisma.order.findMany({
        where: { artistId },
        select: { subtotalCents: true, artistPayoutCents: true, status: true }
      }),
      prisma.commissionRequest.count({ where: { artistId, status: { in: pendingRequestStatuses } } }),
      prisma.order.count({ where: { artistId, status: { in: activeOrderStatuses } } }),
      prisma.commissionRequest.findMany({
        where: { artistId, status: { in: pendingRequestStatuses } },
        include: { buyer: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: 4
      }),
      prisma.order.findMany({
        where: { artistId, status: { in: activeOrderStatuses } },
        include: { artwork: { select: { title: true } } },
        orderBy: { createdAt: "desc" },
        take: 4
      }),
      prisma.order.findMany({
        where: {
          artistId,
          createdAt: { gte: yearStart, lt: yearEnd },
          status: { in: ["PAID", "IN_PROGRESS", "SHIPPED", "DELIVERED", "COMPLETED"] }
        },
        select: { subtotalCents: true, createdAt: true }
      }),
      prisma.payout.findMany({ where: { artistId }, select: { amountCents: true } })
    ]);

  const totalRevenueCents = orders.reduce((total, order) => total + order.subtotalCents, 0);
  const paidOutCents = payouts.reduce((total, payout) => total + payout.amountCents, 0);
  const earnedPayoutCents = orders
    .filter((order) => order.status !== "PENDING_PAYMENT" && order.status !== "CANCELLED")
    .reduce((total, order) => total + order.artistPayoutCents, 0);
  const nextPayoutCents = Math.max(earnedPayoutCents - paidOutCents, 0);

  const monthlyTotals = monthLabels.map(() => 0);
  for (const order of yearOrders) {
    monthlyTotals[order.createdAt.getMonth()] += order.subtotalCents;
  }
  const maxMonthly = Math.max(...monthlyTotals, 1);
  const currentMonth = selectedYear === currentYear ? new Date().getMonth() : -1;

  return (
    <>
      <Nav active="requests" />
      <main className="page studio-page">
        <VerificationBanner verificationStatus={user.artistProfile.verificationStatus} />
        <header className="studio-header studio-header-row">
          <div>
            <h1>Studio Dashboard</h1>
            <p>Overview of your recent sales, active commissions, and shipping logistics.</p>
          </div>
          <div className="studio-header-actions">
            <Link className="button button-secondary" href="/studio/portfolio">
              Portfolio
            </Link>
            <Link className="button button-secondary" href="/studio/artworks">
              Manage Artworks
            </Link>
            <Link className="button button-primary" href="/studio/artworks/new">
              List New Artwork
            </Link>
          </div>
        </header>

        <section className="studio-grid">
          <div className="studio-left">
            <div className="kpi-grid">
              <Kpi
                caption={`${orders.length} total order${orders.length === 1 ? "" : "s"}`}
                title="Total Revenue"
                value={serializeMoney(totalRevenueCents).formatted}
              />
              <Kpi
                caption={pendingRequestsCount ? `${pendingRequestsCount} require attention` : "All caught up"}
                title="Pending Requests"
                value={String(pendingRequestsCount)}
              />
              <Kpi
                caption={activeOrdersCount ? `${activeOrdersCount} in fulfillment` : "Nothing in progress"}
                title="Active Orders"
                value={String(activeOrdersCount)}
              />
            </div>

            <article className="dashboard-card sales-card">
              <div className="card-heading">
                <h2>Sales Overview</h2>
                <YearSelector currentYear={currentYear} year={selectedYear} />
              </div>
              <div className="bar-chart">
                {monthLabels.map((label, index) => (
                  <div className="bar-wrap" key={label}>
                    <div
                      className={`bar ${index === currentMonth ? "is-active" : ""}`}
                      style={{ height: `${Math.max((monthlyTotals[index] / maxMonthly) * 100, 2)}%` }}
                    >
                      <span>{serializeMoney(monthlyTotals[index]).formatted}</span>
                    </div>
                    <small>{label}</small>
                  </div>
                ))}
              </div>
            </article>

            <article className="dashboard-card list-card">
              <div className="card-heading">
                <h2>Next Payout</h2>
              </div>
              <p className="payout-figure">{serializeMoney(nextPayoutCents).formatted}</p>
              <p className="payout-caption">
                Based on your {Number(100 - (user.artistProfile.commissionRate ?? 15)).toFixed(0)}% share after
                the platform commission, pending payout processing.
              </p>
            </article>
          </div>

          <aside className="studio-right">
            <article className="dashboard-card list-card">
              <div className="card-heading">
                <h2>Pending Requests</h2>
                <Link href="/studio/commissions">View All</Link>
              </div>
              <div className="dashboard-list">
                {pendingRequests.length ? (
                  pendingRequests.map((request) => (
                    <Link className="request-row" href={`/studio/commissions/${request.id}`} key={request.id}>
                      <div className="icon-tile">
                        <Icon name={requestIconByType[request.artworkType] || "palette"} />
                      </div>
                      <div>
                        <h3>{request.title}</h3>
                        <p>
                          From: {request.buyer.firstName} {request.buyer.lastName[0]}.
                        </p>
                      </div>
                      <span className="tag">{request.status.replace(/_/g, " ")}</span>
                    </Link>
                  ))
                ) : (
                  <p className="empty-state-inline">No pending commission requests.</p>
                )}
              </div>
            </article>

            <article className="dashboard-card list-card">
              <div className="card-heading">
                <h2>Active Orders</h2>
                <Link href="/orders">View All</Link>
              </div>
              <div className="dashboard-list">
                {activeOrders.length ? (
                  activeOrders.map((order) => (
                    <div className="order-row" key={order.id}>
                      <div className="order-top">
                        <h3>Order #{order.id.slice(-6).toUpperCase()}</h3>
                        <strong>{serializeMoney(order.subtotalCents, order.currency).formatted}</strong>
                      </div>
                      <p>
                        <span className={order.status === "SHIPPED" ? "dot active-dot" : "dot"} />
                        {order.artwork?.title || "Commission"} · {order.status.replace(/_/g, " ")}
                      </p>
                      <OrderShipAction orderId={order.id} status={order.status} />
                    </div>
                  ))
                ) : (
                  <p className="empty-state-inline">No active orders right now.</p>
                )}
              </div>
            </article>
          </aside>
        </section>
      </main>
      <Footer variant="simple" />
    </>
  );
}

function Kpi({ title, value, caption }) {
  return (
    <article className="dashboard-card kpi">
      <h2>{title}</h2>
      <div>
        <strong>{value}</strong>
        <p>{caption}</p>
      </div>
    </article>
  );
}
