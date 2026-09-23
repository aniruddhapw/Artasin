import { fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isUndeliverableEmail, sendPersonalizedEmails } from "@/lib/email";
import { phoneNumberReminderEmail } from "@/lib/emails";

// Everyone who could receive a notification but has no number on file. Admins
// are left out for the same reason /admin/buyers leaves them out — they are
// staff accounts, not people the marketplace notifies.
const missingPhoneFilter = {
  role: { not: "ADMIN" },
  OR: [{ phone: null }, { phone: "" }]
};

async function loadRecipients() {
  const users = await prisma.user.findMany({
    where: missingPhoneFilter,
    select: { email: true, firstName: true, artistProfile: { select: { id: true } } }
  });
  const deliverable = users.filter((user) => !isUndeliverableEmail(user.email));
  return { deliverable, skipped: users.length - deliverable.length };
}

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (user?.role !== "ADMIN") {
      return fail("Admin access required", 403);
    }
    const { deliverable, skipped } = await loadRecipients();
    return ok({ pending: deliverable.length, skipped });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (user?.role !== "ADMIN") {
      return fail("Admin access required", 403);
    }

    const { deliverable, skipped } = await loadRecipients();

    const sent = await sendPersonalizedEmails(
      deliverable.map((recipient) => ({
        to: recipient.email,
        ...phoneNumberReminderEmail(recipient.firstName, Boolean(recipient.artistProfile))
      }))
    );

    return ok({ sent, skipped });
  } catch (error) {
    return handleApiError(error);
  }
}
