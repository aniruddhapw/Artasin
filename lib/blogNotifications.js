import { prisma } from "@/lib/db";
import { sendBroadcast } from "@/lib/broadcasts";
import { sendEmail } from "@/lib/email";
import { blogPostDecisionEmail, blogPostSubmittedAdminEmail, newBlogPostEmail } from "@/lib/emails";

/**
 * Called once, the first time an admin approves a post — not on every edit
 * or re-approval afterward.
 *
 * This used to read every row out of the users table and mail them all. It now
 * hands one message to Resend and lets the subscriber list decide who gets it,
 * which is the only way somebody can refuse: an unsubscribe made on Resend's
 * preference page never reaches our database, so a list we assemble ourselves
 * is always the wrong one.
 *
 * Returns the outcome; publishing never depends on the mail going out.
 */
export async function notifyBlogPostPublished(post) {
  const artistProfile = await prisma.artistProfile.findUnique({
    where: { id: post.artistId },
    select: { displayName: true }
  });
  if (!artistProfile) {
    return { sent: false, reason: "artist-missing" };
  }

  try {
    return await sendBroadcast({
      // Internal label only — it is what the Broadcasts dashboard lists, and
      // several posts can share a title.
      name: `Journal: ${post.slug}`,
      ...newBlogPostEmail(post, artistProfile.displayName)
    });
  } catch (error) {
    console.error(`Blog announcement for "${post.title}" failed:`, error.message);
    return { sent: false, reason: "error" };
  }
}

/** Tells every admin a post is waiting. sendEmail never throws. */
export async function notifyBlogPostSubmitted(post) {
  const [artistProfile, admins] = await Promise.all([
    prisma.artistProfile.findUnique({ where: { id: post.artistId }, select: { displayName: true } }),
    prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true } })
  ]);
  const message = blogPostSubmittedAdminEmail(post, artistProfile?.displayName || "An artist");
  await Promise.all(admins.map((admin) => sendEmail({ to: admin.email, ...message })));
}

/** Tells the artist whether their post was approved, with the admin's note. */
export async function notifyBlogPostDecision(post, approved, note) {
  const artistProfile = await prisma.artistProfile.findUnique({
    where: { id: post.artistId },
    select: { user: { select: { email: true } } }
  });
  if (artistProfile) {
    await sendEmail({ to: artistProfile.user.email, ...blogPostDecisionEmail(post, approved, note) });
  }
}
