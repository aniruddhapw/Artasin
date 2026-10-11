import { prisma } from "@/lib/db";
import { isUndeliverableEmail } from "@/lib/email";
import { parseEmailList } from "@/lib/emailList";

/**
 * Where messages meant for the Artasin team go.
 *
 * ADMIN_NOTIFICATION_EMAIL (comma separated) wins. Without it, every admin
 * account that can actually receive mail. The only admin account on the live
 * site is admin@example.com, which can't, so before this existed those emails
 * (a journal post waiting for review) never reached anyone.
 */
export async function adminNotificationEmails() {
  const configured = parseEmailList(process.env.ADMIN_NOTIFICATION_EMAIL);
  if (configured.length) {
    return configured;
  }
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true } });
  return admins.map((admin) => admin.email).filter((email) => !isUndeliverableEmail(email));
}
