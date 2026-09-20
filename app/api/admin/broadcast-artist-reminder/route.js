import { fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { artistUploadReminderEmail } from "@/lib/emails";

// One-off broadcast, meant to be deleted after use — there's no recurring
// trigger for "remind artists to upload," unlike the transactional emails
// this reuses lib/emails.js and lib/email.js for.
export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (user?.role !== "ADMIN") {
      return fail("Admin access required", 403);
    }

    const artists = await prisma.user.findMany({
      where: { role: "ARTIST" },
      select: { email: true, firstName: true }
    });

    let sent = 0;
    let failed = 0;
    for (const artist of artists) {
      const result = await sendEmail({ to: artist.email, ...artistUploadReminderEmail(artist.firstName) });
      if (result) {
        sent += 1;
      } else {
        failed += 1;
      }
    }

    return ok({ total: artists.length, sent, failed });
  } catch (error) {
    return handleApiError(error);
  }
}
