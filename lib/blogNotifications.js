import { prisma } from "@/lib/db";
import { sendBulkEmail } from "@/lib/email";
import { newBlogPostEmail } from "@/lib/emails";

const NOTHING_SENT = { sent: 0, skipped: 0, failed: false };

// Called once, right when a post transitions into PUBLISHED — not on every
// edit afterward. Everyone gets the same email except the author themselves.
//
// Returns the send summary so a caller can report it; publishing itself never
// depends on the mail going out.
export async function notifyBlogPostPublished(post) {
  const artistProfile = await prisma.artistProfile.findUnique({
    where: { id: post.artistId },
    select: { displayName: true, userId: true }
  });
  if (!artistProfile) {
    return NOTHING_SENT;
  }

  const recipients = await prisma.user.findMany({
    where: { id: { not: artistProfile.userId } },
    select: { email: true }
  });
  if (!recipients.length) {
    return NOTHING_SENT;
  }

  return sendBulkEmail(
    recipients.map((user) => user.email),
    newBlogPostEmail(post, artistProfile.displayName)
  );
}
