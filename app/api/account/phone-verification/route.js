import { fail, handleApiError, ok, rateLimited } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { startVerification } from "@/lib/phoneVerification";
import { checkRateLimit, rateLimitKeyForValue } from "@/lib/rateLimit";
import { isWhatsAppVerificationEnabled, verificationLink, verificationMessage } from "@/lib/whatsapp";

function isVerified(user) {
  return Boolean(user.phone && user.phoneVerifiedAt);
}

/** Polled by the page while it waits for the WhatsApp message to arrive. */
export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return fail("Authentication required", 401);
    }
    return ok({ enabled: isWhatsAppVerificationEnabled(), verified: isVerified(user), phone: user.phone });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return fail("Authentication required", 401);
    }
    if (!isWhatsAppVerificationEnabled()) {
      return fail("Phone verification isn't available yet", 503);
    }
    if (!user.phone) {
      return fail("Add a phone number first", 400);
    }
    if (isVerified(user)) {
      return ok({ verified: true });
    }

    const limit = await checkRateLimit(rateLimitKeyForValue("phone-verification", user.id), {
      max: 10,
      windowMs: 60 * 60 * 1000
    });
    if (limit.limited) {
      return rateLimited(limit.retryAfterSeconds);
    }

    const verification = await startVerification(user);
    return ok({
      verified: false,
      phone: user.phone,
      message: verificationMessage(verification.code),
      link: verificationLink(verification.code),
      expiresAt: verification.expiresAt
    });
  } catch (error) {
    return handleApiError(error);
  }
}
