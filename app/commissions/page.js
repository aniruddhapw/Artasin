import Link from "next/link";
import { redirect } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "My Commission Requests"
};

export default async function BuyerCommissionsPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login?redirect=/commissions");
  }

  const requests = await prisma.commissionRequest.findMany({
    where: { buyerId: user.id },
    include: { artist: { select: { displayName: true } } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <>
      <Nav active="requests" />
      <main className="page request-page">
        <header className="request-header studio-header-row">
          <div>
            <h1>My Commission Requests</h1>
            <p>Track briefs, quotes, and progress with your commissioned artists.</p>
          </div>
          <Link className="button button-primary" href="/requests">
            New Request
          </Link>
        </header>

        {requests.length ? (
          <div className="order-history-list">
            {requests.map((request) => (
              <Link className="order-history-row" href={`/commissions/${request.id}`} key={request.id}>
                <div className="order-history-details">
                  <h3>{request.title}</h3>
                  <p>
                    {request.artist?.displayName || "Open to recommendations"} · {request.artworkType}
                  </p>
                </div>
                <div className="order-history-meta">
                  <span className="tag">{request.status.replace(/_/g, " ")}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-state">
            No commission requests yet. <Link href="/requests">Start a new commission</Link>.
          </p>
        )}
      </main>
      <Footer variant="simple" />
    </>
  );
}
