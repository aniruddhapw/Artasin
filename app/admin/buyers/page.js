import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { serializeMoney } from "@/lib/api";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Manage Collectors"
};

const spentStatuses = ["PAID", "IN_PROGRESS", "SHIPPED", "DELIVERED", "COMPLETED"];

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminBuyersPage() {
  // Anyone who buys is a collector here, including artists who also purchase,
  // so this lists every non-admin account rather than only role BUYER.
  const users = await prisma.user.findMany({
    where: { role: { not: "ADMIN" } },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      phone: true,
      createdAt: true,
      artistProfile: { select: { slug: true, displayName: true } },
      buyerOrders: {
        select: {
          status: true,
          subtotalCents: true,
          shippingCents: true,
          taxCents: true,
          buyerServiceFeeCents: true,
          currency: true
        }
      },
      _count: { select: { commissionBriefs: true, reviews: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  const rows = users.map((user) => {
    const paidOrders = user.buyerOrders.filter((order) => spentStatuses.includes(order.status));
    // Order has no total column; what the buyer paid is the sum of its parts.
    const spentCents = paidOrders.reduce(
      (total, order) =>
        total + order.subtotalCents + order.shippingCents + order.taxCents + order.buyerServiceFeeCents,
      0
    );
    return {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone,
      role: user.role,
      artistProfile: user.artistProfile,
      joined: user.createdAt,
      orderCount: user.buyerOrders.length,
      paidCount: paidOrders.length,
      spent: serializeMoney(spentCents, user.buyerOrders[0]?.currency || "INR").formatted,
      commissionCount: user._count.commissionBriefs,
      reviewCount: user._count.reviews
    };
  });

  const activeBuyers = rows.filter((row) => row.orderCount || row.commissionCount).length;

  return (
    <>
      <Nav active="collections" />
      <main className="page request-page">
        <header className="request-header studio-header-row">
          <div>
            <h1>Collectors</h1>
            <p>
              {rows.length} {rows.length === 1 ? "account" : "accounts"} · {activeBuyers} with orders or
              commission requests.
            </p>
          </div>
          <div className="studio-header-actions">
            <Link className="button button-secondary" href="/admin/artists">
              Artists
            </Link>
            <Link className="button button-secondary" href="/admin/artworks">
              Artworks
            </Link>
          </div>
        </header>

        {rows.length ? (
          <div className="admin-buyer-table">
            <div className="admin-buyer-head">
              <span>Collector</span>
              <span>Joined</span>
              <span>Orders</span>
              <span>Commissions</span>
              <span>Spent</span>
              <span>Account</span>
            </div>
            {rows.map((row) => (
              <div className="admin-buyer-row" key={row.id}>
                <div className="admin-buyer-identity">
                  <strong>{row.name}</strong>
                  <a className="admin-buyer-email" href={`mailto:${row.email}`}>
                    {row.email}
                  </a>
                  {row.phone ? <span className="admin-buyer-phone">{row.phone}</span> : null}
                </div>
                <span data-label="Joined">{dateFormat.format(row.joined)}</span>
                <span data-label="Orders">
                  {row.orderCount}
                  {row.orderCount && row.paidCount !== row.orderCount ? ` (${row.paidCount} paid)` : ""}
                </span>
                <span data-label="Commissions">{row.commissionCount}</span>
                <span data-label="Spent">{row.spent}</span>
                <span data-label="Account">
                  {row.artistProfile ? (
                    <Link className="text-link" href={`/artist/${row.artistProfile.slug}`}>
                      Also an artist
                    </Link>
                  ) : (
                    <span className="tag">{row.role === "BUYER" ? "COLLECTOR" : row.role}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No collector accounts yet.</p>
        )}
      </main>
      <Footer variant="simple" />
    </>
  );
}
