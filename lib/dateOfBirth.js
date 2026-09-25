import { z } from "zod";

// The terms already require it: "You must be at least 18 years old to create
// an account." Validating against the same number is what turns that sentence
// from a claim into something the software actually holds to.
export const MIN_AGE_YEARS = 18;

// Nobody alive is older than this, so a year typed one digit wrong — 1090 for
// 1990 — is caught rather than stored.
const MAX_AGE_YEARS = 120;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Reads the `YYYY-MM-DD` an `<input type="date">` submits.
 *
 * Everything here works in UTC on purpose. A birthday is a calendar date, not
 * a moment: parsed in local time, a date entered in India and read back on a
 * server behind UTC comes out as the day before. The column is `@db.Date` for
 * the same reason, so nothing downstream reintroduces a clock.
 *
 * Returns null when the input cannot be read as a date, so callers can report
 * a validation error rather than store something wrong.
 */
export function parseDateOfBirth(value) {
  if (typeof value !== "string" || !ISO_DATE.test(value.trim())) {
    return null;
  }
  const [year, month, day] = value.trim().split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  // Date would silently roll 2025-02-30 forward to 2 March; a date that does
  // not survive the round trip never existed.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

/** Completed years, counting the birthday itself as the day the age changes. */
export function ageOn(birth, today = new Date()) {
  const years = today.getUTCFullYear() - birth.getUTCFullYear();
  const month = today.getUTCMonth() - birth.getUTCMonth();
  const beforeBirthday = month < 0 || (month === 0 && today.getUTCDate() < birth.getUTCDate());
  return beforeBirthday ? years - 1 : years;
}

/** Formats a stored date back into what the date input expects. */
export function toDateInputValue(date) {
  return date ? new Date(date).toISOString().slice(0, 10) : "";
}

export const dateOfBirthSchema = z
  .string()
  .trim()
  .transform(parseDateOfBirth)
  // Each check tolerates null so that an unparseable date reports only that,
  // rather than also trying to measure an age against nothing.
  .refine((value) => value !== null, { message: "must be a date like 1990-05-15" })
  .refine((value) => value === null || ageOn(value) >= MIN_AGE_YEARS, {
    message: `must be at least ${MIN_AGE_YEARS} years ago`
  })
  .refine((value) => value === null || ageOn(value) <= MAX_AGE_YEARS, {
    message: "does not look like a real date of birth"
  });
