import crypto from "node:crypto";

/**
 * Links that unsubscribe someone from the newsletter without signing in.
 *
 * The token is the user's id plus an HMAC of it, so it can't be forged or
 * pointed at somebody else, and it never expires: an unsubscribe link in an
 * old email should still work. It does nothing on its own; the page it opens
 * asks for a click, because mail scanners fetch every link in a message.
 */

const PURPOSE = "newsletter-unsubscribe";

function signature(userId, secret) {
  return crypto.createHmac("sha256", secret).update(`${PURPOSE}:${userId}`).digest("base64url");
}

function secretOrThrow(secret) {
  if (!secret || secret.length < 24) {
    throw new Error("JWT_SECRET must be set to a long random value");
  }
  return secret;
}

export function createUnsubscribeToken(userId, secret = process.env.JWT_SECRET) {
  return `${Buffer.from(userId).toString("base64url")}.${signature(userId, secretOrThrow(secret))}`;
}

/** The user id the token was made for, or null if it isn't genuine. */
export function readUnsubscribeToken(token, secret = process.env.JWT_SECRET) {
  if (typeof token !== "string" || !token.includes(".")) {
    return null;
  }
  const [encodedId, given] = token.split(".");
  const userId = Buffer.from(encodedId, "base64url").toString();
  if (!userId) {
    return null;
  }
  const expected = signature(userId, secretOrThrow(secret));
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? userId : null;
}

export function unsubscribeUrl(siteUrl, userId) {
  return `${siteUrl}/unsubscribe?token=${createUnsubscribeToken(userId)}`;
}
