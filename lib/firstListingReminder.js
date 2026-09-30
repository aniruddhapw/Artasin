import { prisma } from "@/lib/db";
import { isUndeliverableEmail } from "@/lib/email";

/**
 * Approved artists who have never added a single artwork, draft or otherwise.
 * Artists still awaiting approval are left out: they can't publish yet, so
 * asking them to list something would only lead to a dead end.
 */
export async function loadEmptyStudioRecipients() {
  const artists = await prisma.artistProfile.findMany({
    where: { verificationStatus: "APPROVED", user: { role: "ARTIST" }, artworks: { none: {} } },
    select: { user: { select: { email: true, firstName: true } } }
  });
  const users = artists.map((artist) => artist.user);
  // sendPersonalizedEmails drops these too, so this is not what keeps the send
  // working — it is what lets the button say how many were left out.
  const deliverable = users.filter((user) => !isUndeliverableEmail(user.email));
  return { deliverable, skipped: users.length - deliverable.length };
}
