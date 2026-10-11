/**
 * Whether orders can be placed and paid.
 *
 * The `manual` payment provider confirms any order instantly without taking
 * money, which is right for local development and the dev site and wrong for
 * the live one: anyone signed in could "buy" a painting for nothing, marking it
 * sold and emailing the artist about a sale that never happened. So on
 * production, checkout stays closed until a real provider such as Razorpay is
 * configured, and opens by itself once it is.
 */
export function checkoutOpen(env = process.env) {
  const provider = env.PAYMENT_PROVIDER || "manual";
  return !(env.VERCEL_ENV === "production" && provider === "manual");
}

export const CHECKOUT_CLOSED = "Checkout isn't open yet";
