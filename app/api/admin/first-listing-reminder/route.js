import { fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { sendPersonalizedEmails } from "@/lib/email";
import { firstListingReminderEmail } from "@/lib/emails";
import { loadEmptyStudioRecipients } from "@/lib/firstListingReminder";

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (user?.role !== "ADMIN") {
      return fail("Admin access required", 403);
    }
    const { deliverable, skipped } = await loadEmptyStudioRecipients();
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

    const { deliverable, skipped } = await loadEmptyStudioRecipients();

    const sent = await sendPersonalizedEmails(
      deliverable.map((recipient) => ({
        to: recipient.email,
        ...firstListingReminderEmail(recipient.firstName)
      }))
    );

    return ok({ sent, skipped });
  } catch (error) {
    return handleApiError(error);
  }
}
