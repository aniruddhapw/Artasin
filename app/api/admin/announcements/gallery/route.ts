import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api";
import { GALLERY_ANNOUNCEMENT, fillMergeTags } from "@/lib/announcements";
import { getAuthUser } from "@/lib/auth";
import { findSentBroadcast, sendBroadcast } from "@/lib/broadcasts";
import { sendEmail } from "@/lib/email";
import { newsletterEnabled } from "@/lib/newsletter";

const schema = z.object({
  action: z.enum(["test", "send"])
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

/** Whether the 3D gallery announcement can go out, whether it already has, and what it says. */
export async function GET(request: Request) {
  try {
    const admin = await getAuthUser(request);
    if (admin?.role !== "ADMIN") {
      return fail("Admin access required", 403);
    }
    const { subject, html } = GALLERY_ANNOUNCEMENT.content();
    return ok({
      enabled: newsletterEnabled(),
      sent: await findSentBroadcast(GALLERY_ANNOUNCEMENT.name),
      subject,
      previewHtml: fillMergeTags(html, { firstName: admin.firstName, unsubscribeUrl: "#" })
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * "test" emails the announcement to the admin alone. "send" hands it to Resend
 * as a Broadcast to the newsletter list, which leaves out everyone who has
 * unsubscribed; it is refused if the announcement has already gone out.
 */
export async function POST(request: Request) {
  try {
    const admin = await getAuthUser(request);
    if (admin?.role !== "ADMIN") {
      return fail("Admin access required", 403);
    }
    const { action } = schema.parse(await request.json());
    const { subject, html } = GALLERY_ANNOUNCEMENT.content();

    if (action === "test") {
      const sent = await sendEmail({
        to: admin.email,
        subject: `[Test] ${subject}`,
        html: fillMergeTags(html, { firstName: admin.firstName, unsubscribeUrl: `${siteUrl}/account` })
      });
      if (!sent) {
        return fail("The test email could not be sent", 502);
      }
      return ok({ testSentTo: admin.email });
    }

    if (!newsletterEnabled()) {
      return fail("The newsletter isn't set up on this deployment", 409);
    }
    const previous = await findSentBroadcast(GALLERY_ANNOUNCEMENT.name);
    if (previous) {
      return fail("This announcement has already been sent", 409, { sent: previous });
    }
    const result = await sendBroadcast({ name: GALLERY_ANNOUNCEMENT.name, subject, html });
    if (!result.sent) {
      return fail("The announcement could not be sent", 502, { reason: result.reason });
    }
    return ok({ broadcastId: result.id ?? null });
  } catch (error) {
    return handleApiError(error);
  }
}
