/**
 * Which payment provider is really in force.
 *
 * `manual` confirms any order instantly without taking money. That suits local
 * development and the dev site, but on the live site it let anyone signed in
 * "buy" a painting for nothing, marking it sold and emailing the artist about a
 * sale that never happened. So on production `manual` is treated as `offline`:
 * the order is taken as a request, nothing is marked paid, and the team
 * arranges payment with the buyer directly. Setting PAYMENT_PROVIDER to a real
 * provider such as razorpay switches it off.
 */
export function effectiveProviderName(env = process.env) {
  const name = env.PAYMENT_PROVIDER || "manual";
  return env.VERCEL_ENV === "production" && name === "manual" ? "offline" : name;
}

export function isOfflinePayments(env = process.env) {
  return effectiveProviderName(env) === "offline";
}
