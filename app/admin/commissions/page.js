import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { serializeMoney } from "@/lib/api";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Custom Requests"
};

// Everything else is still in flight and may need an admin to step in.
const closedStatuses = ["COMPLETED", "REJECTED", "CANCELLED"];

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

function budgetLabel(request) {
  if (request.quotedPriceCents) {
    return `Quoted ${serializeMoney(request.quotedPriceCents, request.currency).formatted}`;
  }
  const { budgetMinCents: min, budgetMaxCents: max, currency } = request;
  if (min && max) {
    return `${serializeMoney(min, currency).formatted} – ${serializeMoney(max, currency).formatted}`;
  }
  if (min || max) {
    return `${min ? "From" : "Up to"} ${serializeMoney(min || max, currency).formatted}`;
  }
  return "No budget given";
}

function summarise(text, limit = 150) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) {
    return clean;
  }
  const cut = clean.slice(0, limit);
  return `${cut.slice(0, cut.lastIndexOf(" ")) || cut}…`;
}

export default async function AdminCommissionsPage() {
  const requests = await prisma.commissionRequest.findMany({
    include: {
      buyer: { select: { firstName: true, lastName: true, email: true } },
      artist: { select: { displayName: true, slug: true } }
    },
    orderBy: { updatedAt: "desc" }
  });

  const openCount = requests.filter((request) => !closedStatuses.includes(request.status)).length;
  const unassignedCount = requests.filter((request) => !request.artist).length;

  return (
    <>
      <Nav />
      <main className="page request-page">
        <header className="request-header studio-header-row">
          <div>
            <h1>Custom Requests</h1>
            <p>
              {requests.length} {requests.length === 1 ? "request" : "requests"} · {openCount} open
              {unassignedCount ? ` · ${unassignedCount} unassigned` : ""}.
            </p>
          </div>
          <div className="studio-header-actions">
            <Link className="button button-secondary" href="/admin/buyers">
              Collectors
            </Link>
            <Link className="button button-secondary" href="/admin/artists">
              Artists
            </Link>
          </div>
        </header>

        {requests.length ? (
          <div className="order-history-list">
            {requests.map((request) => (
              <div className="order-history-row" key={request.id}>
                <div className="order-history-details">
                  <h3>{request.title}</h3>
                  <p>
                    {request.artworkType}
                    {request.medium ? ` · ${request.medium}` : ""} · {request.buyer.firstName}{" "}
                    {request.buyer.lastName} ({request.buyer.email}) →{" "}
                    {request.artist ? (
                      <Link className="text-link" href={`/artist/${request.artist.slug}`}>
                        {request.artist.displayName}
                      </Link>
                    ) : (
                      "Unassigned"
                    )}
                  </p>
                  <p>{summarise(request.requirements)}</p>
                </div>
                <div className="order-history-meta">
                  <strong>{budgetLabel(request)}</strong>
                  <span className="tag">{request.status.replace(/_/g, " ")}</span>
                  <span>{dateFormat.format(request.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No custom requests yet.</p>
        )}
      </main>
      <Footer variant="simple" />
    </>
  );
}
