/**
 * What a code sent from a number should do, given the code's row (or null)
 * and the account it belongs to. Kept free of the database so the rules can
 * be tested on their own.
 */
import type { PhoneVerification, User } from "@prisma/client";

export type VerificationOutcome = "verified" | "already" | "expired" | "wrong-number" | "unknown";

export function verificationOutcome(
  verification: Pick<PhoneVerification, "phone" | "expiresAt" | "usedAt"> | null | undefined,
  user: Pick<User, "phone" | "phoneVerifiedAt"> | null | undefined,
  from: string,
  now: Date = new Date()
): VerificationOutcome {
  if (!verification || !user) {
    return "unknown";
  }
  if (verification.usedAt) {
    return user.phoneVerifiedAt && user.phone === from ? "already" : "unknown";
  }
  if (verification.expiresAt <= now) {
    return "expired";
  }
  // The code was made for one number; it only proves that number. If the
  // account's number has changed since, the code no longer applies either.
  if (verification.phone !== from || user.phone !== from) {
    return "wrong-number";
  }
  return "verified";
}
