import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Commission Requests"
};

export default async function StudioCommissionsPage() {
  const user = await getAuthUser();
  const requests = await prisma.commissionRequest.findMany({
    where: { artistId: user.artistProfile.id },
    include: { buyer: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <>
      <Nav active="requests" />
      <main className="page request-page">
        <header className="request-header">
          <h1>Commission Requests</h1>
          <p>Review briefs, send quotes, and manage bespoke work in progress.</p>
        </header>

        {requests.length ? (
          <div className="order-history-list">
            {requests.map((request) => (
              <Link className="order-history-row" href={`/studio/commissions/${request.id}`} key={request.id}>
                <div className="order-history-details">
                  <h3>{request.title}</h3>
                  <p>
                    From {request.buyer.firstName} {request.buyer.lastName} · {request.artworkType}
                  </p>
                </div>
                <div className="order-history-meta">
                  <span className="tag">{request.status.replace(/_/g, " ")}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-state">No commission requests yet.</p>
        )}
      </main>
      <Footer variant="simple" />
    </>
  );
}
