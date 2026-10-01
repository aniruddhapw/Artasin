/**
 * Where to send someone after sign-in, taken from a ?redirect= value.
 *
 * Only paths on this site are allowed. A bare `startsWith("/")` check is not
 * enough: `//evil.com` and `/\evil.com` both start with a slash, and browsers
 * treat them as links to another site.
 */
export function safeRedirectPath(value, fallback = "/") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}

/**
 * The step that asks for a phone number, then carries on to `destination`.
 * Admins are staff accounts the marketplace never messages, so they skip it.
 */
export function afterSignIn(user, destination) {
  if (!user.phone && user.role !== "ADMIN") {
    return `/add-phone?redirect=${encodeURIComponent(destination)}`;
  }
  return destination;
}
