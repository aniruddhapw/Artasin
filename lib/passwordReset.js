/**
 * Why a reset link can't be used, or null if it can.
 *
 * Each case gets its own message because each needs a different next step.
 * Someone told "request a new one" when their password was in fact already
 * changed ends up requesting link after link and never signing in.
 *
 * Telling these apart gives nothing away: only someone holding the link from
 * the email gets this far.
 */
export function resetLinkProblem(resetToken, now = new Date()) {
  if (!resetToken) return "invalid";
  if (resetToken.usedAt) return "used";
  if (resetToken.expiresAt < now) return "expired";
  return null;
}

export const RESET_LINK_MESSAGES = {
  invalid: "This reset link isn't recognised. Check that you opened the whole link from the email.",
  // Neutral on purpose: links cancelled before this change are marked used
  // too, without any password having changed.
  used: "This reset link can't be used any more. If you've already set a new password, sign in with it. If not, use the link in your most recent reset email.",
  expired: "This reset link has expired. Request a new one; it works for an hour."
};
