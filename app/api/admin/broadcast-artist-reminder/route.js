import { fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { artistUploadReminderEmail } from "@/lib/emails";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// One-off broadcast, meant to be deleted after use — there's no recurring
// trigger for "remind artists to upload," unlike the transactional emails
// this reuses lib/emails.js and lib/email.js for. Resend caps at 10
// requests/second, so sends are spaced out to stay under that. An optional
// `emails` filter lets a retry target just the addresses that failed
// instead of re-sending to everyone.
export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (user?.role !== "ADMIN") {
      return fail("Admin access required", 403);
    }

    const body = await request.json().catch(() => ({}));
    const emailFilter = Array.isArray(body?.emails) ? body.emails : null;

    const artists = await prisma.user.findMany({
      where: { role: "ARTIST", ...(emailFilter ? { email: { in: emailFilter } } : {}) },
      select: { email: true, firstName: true }
    });

    const failures = [];
    let sent = 0;
    for (const artist of artists) {
      const result = await sendEmail({ to: artist.email, ...artistUploadReminderEmail(artist.firstName) });
      if (result) {
        sent += 1;
      } else {
        failures.push(artist.email);
      }
      await sleep(150);
    }

    return ok({ total: artists.length, sent, failed: failures.length, failures });
  } catch (error) {
    return handleApiError(error);
  }
}
