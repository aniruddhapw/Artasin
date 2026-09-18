import { prisma } from "@/lib/db";
import { sendBulkEmail } from "@/lib/email";
import { newBlogPostEmail } from "@/lib/emails";

// Called once, right when a post transitions into PUBLISHED — not on every
// edit afterward. Everyone gets the same email except the author themselves.
export async function notifyBlogPostPublished(post) {
  const artistProfile = await prisma.artistProfile.findUnique({
    where: { id: post.artistId },
    select: { displayName: true, userId: true }
  });
  if (!artistProfile) {
    return;
  }

  const recipients = await prisma.user.findMany({
    where: { id: { not: artistProfile.userId } },
    select: { email: true }
  });
  if (!recipients.length) {
    return;
  }

  await sendBulkEmail(
    recipients.map((user) => user.email),
    newBlogPostEmail(post, artistProfile.displayName)
  );
}
