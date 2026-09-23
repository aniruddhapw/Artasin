import { fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendPersonalizedEmails } from "@/lib/email";
import { phoneNumberReminderEmail } from "@/lib/emails";

// Everyone who could receive a notification but has no number on file. Admins
// are left out for the same reason /admin/buyers leaves them out — they are
// staff accounts, not people the marketplace notifies.
const missingPhoneFilter = {
  role: { not: "ADMIN" },
  OR: [{ phone: null }, { phone: "" }]
};

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (user?.role !== "ADMIN") {
      return fail("Admin access required", 403);
    }
    return ok({ pending: await prisma.user.count({ where: missingPhoneFilter }) });
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

    const recipients = await prisma.user.findMany({
      where: missingPhoneFilter,
      select: { email: true, firstName: true, artistProfile: { select: { id: true } } }
    });

    const sent = await sendPersonalizedEmails(
      recipients.map((recipient) => ({
        to: recipient.email,
        ...phoneNumberReminderEmail(recipient.firstName, Boolean(recipient.artistProfile))
      }))
    );

    return ok({ sent });
  } catch (error) {
    return handleApiError(error);
  }
}
