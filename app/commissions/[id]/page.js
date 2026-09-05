import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { MessageThread } from "@/components/commissions/MessageThread";
import { MeetingScheduler } from "@/components/commissions/MeetingScheduler";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeMoney } from "@/lib/api";

export const metadata = {
  title: "Commission Request"
};

export default async function BuyerCommissionDetailPage({ params }) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) {
    redirect(`/login?redirect=/commissions/${id}`);
  }

  const commissionRequest = await prisma.commissionRequest.findUnique({
    where: { id },
    include: {
      artist: { select: { displayName: true, slug: true } },
      meetings: { orderBy: { scheduledAt: "asc" } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { firstName: true, lastName: true } } }
      }
    }
  });

  if (!commissionRequest || commissionRequest.buyerId !== user.id) {
    notFound();
  }

  return (
    <>
      <Nav active="requests" />
      <main className="page request-page">
        <header className="request-header">
          <p className="tag">{commissionRequest.status.replace(/_/g, " ")}</p>
          <h1>{commissionRequest.title}</h1>
          <p>
            {commissionRequest.artist?.displayName || "Open to recommendations"} · {commissionRequest.artworkType}
            {commissionRequest.medium ? ` · ${commissionRequest.medium}` : ""}
          </p>
        </header>

        <section className="commission-detail-layout">
          <div className="commission-detail-main">
            <article className="dashboard-card">
              <h2>Brief</h2>
              <p>{commissionRequest.requirements}</p>
              <dl className="order-confirmation-detail-list">
                {commissionRequest.budgetMinCents ? (
                  <div>
                    <dt>Budget Range</dt>
                    <dd>
                      {serializeMoney(commissionRequest.budgetMinCents).formatted} –{" "}
                      {commissionRequest.budgetMaxCents
                        ? serializeMoney(commissionRequest.budgetMaxCents).formatted
                        : "Open"}
                    </dd>
                  </div>
                ) : null}
                {commissionRequest.timeline ? (
                  <div>
                    <dt>Timeline</dt>
                    <dd>{commissionRequest.timeline}</dd>
                  </div>
                ) : null}
                {commissionRequest.quotedPriceCents ? (
                  <div>
                    <dt>Quoted Price</dt>
                    <dd>{serializeMoney(commissionRequest.quotedPriceCents, commissionRequest.currency).formatted}</dd>
                  </div>
                ) : null}
              </dl>
              {commissionRequest.referenceUrls.length ? (
                <div className="reference-grid">
                  {commissionRequest.referenceUrls.map((url) => (
                    <a href={url} key={url} rel="noreferrer" target="_blank">
                      <img alt="Reference" src={url} />
                    </a>
                  ))}
                </div>
              ) : null}

              {commissionRequest.status === "QUOTED" ? (
                <Link
                  className="button button-primary"
                  href={`/checkout?commissionRequestId=${commissionRequest.id}`}
                >
                  Accept Quote &amp; Proceed to Checkout
                </Link>
              ) : null}
            </article>

            <article className="dashboard-card">
              <h2>Messages</h2>
              <MessageThread
                commissionRequestId={commissionRequest.id}
                currentUserId={user.id}
                messages={commissionRequest.messages}
              />
            </article>
          </div>

          <aside className="commission-detail-side">
            <article className="dashboard-card">
              <h2>Meetings</h2>
              <MeetingScheduler commissionRequestId={commissionRequest.id} meetings={commissionRequest.meetings} />
            </article>
          </aside>
        </section>
      </main>
      <Footer variant="simple" />
    </>
  );
}
