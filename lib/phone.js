import { z } from "zod";

// Most of the marketplace is in India, so a number typed without a country
// code is assumed to be Indian rather than rejected.
const DEFAULT_DIALING_CODE = "91";

/**
 * Normalises a typed phone number to E.164 (`+919876543210`).
 *
 * Numbers are stored normalised because WhatsApp and every SMS provider
 * require E.164 — a number kept as "98765 43210" or "0 9876543210" is not
 * messageable without guessing at it later, when the person who typed it is
 * no longer around to ask.
 *
 * Returns null when the input cannot be read as a phone number, so callers
 * can surface a validation error instead of storing something unusable.
 */
export function normalizePhone(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  const explicitCountryCode = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");

  if (!explicitCountryCode) {
    if (digits.startsWith("00")) {
      // 00 is the international dialling prefix across most of the world.
      digits = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith("0")) {
      // A domestic Indian number written with the trunk prefix.
      digits = DEFAULT_DIALING_CODE + digits.slice(1);
    } else if (digits.length === 10) {
      digits = DEFAULT_DIALING_CODE + digits;
    }
  }

  // E.164 allows 15 digits including the country code; no country code starts
  // with 0, so a leading zero here means we failed to strip a trunk prefix.
  if (digits.length < 8 || digits.length > 15 || digits.startsWith("0")) {
    return null;
  }

  return `+${digits}`;
}

/** Accepts what a person actually types and stores E.164. */
export const phoneSchema = z
  .string()
  .trim()
  .transform(normalizePhone)
  .refine((value) => value !== null, { message: "must be a valid phone number" });
