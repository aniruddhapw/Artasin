import { fail, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { newCommissionMessageEmail } from "@/lib/emails";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
const FOLLOWUP_DELAY_MS = 6 * 60 * 60 * 1000;

// Runs once a day (see vercel.json — Hobby plan caps crons at once/day, with
// the actual trigger floating within that hour). Emails a commission thread's
// other party only if the thread's latest message is still unanswered 6+
// hours after it was sent — an active back-and-forth never emails at all,
// since a reply always produces a newer "latest" message that resets this
// check. Each qualifying message gets exactly one follow-up email, tracked
// via followupEmailSentAt so a second cron run (or a missed one that catches
// up later) doesn't double-send.
export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return fail("Unauthorized", 401);
  }

  const cutoff = new Date(Date.now() - FOLLOWUP_DELAY_MS);

  const requests = await prisma.commissionRequest.findMany({
    where: { messages: { some: {} } },
    select: {
      id: true,
      title: true,
      buyer: { select: { id: true, email: true } },
      artist: { select: { userId: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          senderId: true,
          body: true,
          createdAt: true,
          followupEmailSentAt: true,
          sender: { select: { firstName: true, lastName: true } }
        }
      }
    }
  });

  let emailed = 0;
  let checked = 0;

  for (const commissionRequest of requests) {
    const latest = commissionRequest.messages[0];
    if (!latest || latest.followupEmailSentAt || latest.createdAt > cutoff) {
      continue;
    }
    checked += 1;

    const isBuyerSender = latest.senderId === commissionRequest.buyer.id;
    const recipient = isBuyerSender
      ? commissionRequest.artist
        ? await prisma.user.findUnique({
            where: { id: commissionRequest.artist.userId },
            select: { id: true, email: true }
          })
        : null
      : { id: commissionRequest.buyer.id, email: commissionRequest.buyer.email };

    if (!recipient) {
      continue;
    }

    try {
      const threadUrl = isBuyerSender
        ? `${siteUrl}/studio/commissions/${commissionRequest.id}`
        : `${siteUrl}/commissions/${commissionRequest.id}`;
      const senderName = `${latest.sender.firstName} ${latest.sender.lastName}`;

      await sendEmail({
        to: recipient.email,
        ...newCommissionMessageEmail(commissionRequest, senderName, latest.body, threadUrl)
      });
      await prisma.message.update({
        where: { id: latest.id },
        data: { followupEmailSentAt: new Date() }
      });
      emailed += 1;
    } catch (error) {
      console.error(`Follow-up email failed for message ${latest.id}:`, error.message);
    }
  }

  return ok({ checked, emailed });
}
