import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { AdminArtistRow } from "@/components/admin/AdminArtistRow";
import { ReminderButton } from "@/components/admin/ReminderButton";
import { prisma } from "@/lib/db";
import { loadEmptyStudioRecipients } from "@/lib/firstListingReminder";

export const metadata = {
  title: "Manage Artists"
};

const earnedStatuses = ["PAID", "IN_PROGRESS", "SHIPPED", "DELIVERED", "COMPLETED"];

export default async function AdminArtistsPage() {
  const [artists, emptyStudios] = await Promise.all([
    prisma.artistProfile.findMany({
      include: {
        orders: { where: { status: { in: earnedStatuses } }, select: { artistPayoutCents: true } },
        payouts: { select: { amountCents: true } },
        _count: { select: { artworks: true } }
      },
      orderBy: { displayName: "asc" }
    }),
    loadEmptyStudioRecipients()
  ]);
  const emptyStudioCount = emptyStudios.deliverable.length;

  const rows = artists.map((artist) => {
    const earnedCents = artist.orders.reduce((total, order) => total + order.artistPayoutCents, 0);
    const paidCents = artist.payouts.reduce((total, payout) => total + payout.amountCents, 0);
    return {
      id: artist.id,
      displayName: artist.displayName,
      verificationStatus: artist.verificationStatus,
      commissionRate: Number(artist.commissionRate),
      artworkCount: artist._count.artworks,
      owedCents: Math.max(earnedCents - paidCents, 0)
    };
  });

  return (
    <>
      <Nav />
      <main className="page request-page">
        <header className="request-header studio-header-row">
          <div>
            <h1>Artists &amp; Payouts</h1>
            <p>Approve new studios, adjust per-artist commission rates, and process outstanding payouts.</p>
          </div>
          <div className="studio-header-actions">
            <Link className="button button-secondary" href="/admin/buyers">
              Collectors
            </Link>
            <Link className="button button-secondary" href="/admin/artworks">
              Artworks
            </Link>
          </div>
        </header>

        {emptyStudioCount ? (
          <article className="dashboard-card admin-notice">
            <h2>Artists With No Work Listed</h2>
            <p>
              {`${emptyStudioCount === 1 ? "1 approved artist hasn’t" : `${emptyStudioCount} approved artists haven’t`} added any artwork yet, so collectors can’t find them in the gallery. Emailing them links straight to the listing form.`}
            </p>
            <ReminderButton endpoint="/api/admin/first-listing-reminder" pending={emptyStudioCount} />
          </article>
        ) : null}

        <div className="admin-artist-table">
          <div className="admin-artist-head">
            <span>Artist</span>
            <span>Verification</span>
            <span>Commission Rate</span>
            <span>Artworks</span>
            <span>Owed Payout</span>
            <span>Payout</span>
          </div>
          {rows.map((artist) => (
            <AdminArtistRow artist={artist} key={artist.id} />
          ))}
        </div>
      </main>
      <Footer variant="simple" />
    </>
  );
}
