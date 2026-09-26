import { fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { countNeverAsked, neverAskedWhere, subscribeWithNotice } from "@/lib/newsletterNotice";
import { newsletterEnabled } from "@/lib/newsletter";

// About a second per person to stay inside Resend's rate limit.
export const maxDuration = 300;

async function requireAdmin(request) {
  const user = await getAuthUser(request);
  return user?.role === "ADMIN";
}

/** How many existing users would be subscribed and notified. */
export async function GET(request) {
  try {
    if (!(await requireAdmin(request))) {
      return fail("Admin access required", 403);
    }
    return ok({ count: await countNeverAsked(), enabled: newsletterEnabled() });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Subscribes everyone who joined before the signup checkbox and was never
 * asked, and emails each of them a notice with a one-click unsubscribe.
 * Safe to run again: anyone already notified is skipped.
 */
export async function POST(request) {
  try {
    if (!(await requireAdmin(request))) {
      return fail("Admin access required", 403);
    }
    // Without Resend configured nobody could be added to the list or
    // unsubscribe from it, so don't flip anyone's preference.
    if (!newsletterEnabled()) {
      return fail("The newsletter isn't set up on this deployment", 409);
    }
    const users = await prisma.user.findMany({ where: neverAskedWhere() });
    return ok(await subscribeWithNotice(users));
  } catch (error) {
    return handleApiError(error);
  }
}
