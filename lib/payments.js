import crypto from "node:crypto";

const providers = {
  manual: {
    async createIntent({ amountCents, currency }) {
      return {
        provider: "manual",
        providerIntentId: `manual_${crypto.randomUUID()}`,
        amountCents,
        currency,
        status: "REQUIRES_PAYMENT"
      };
    },
    async confirmIntent() {
      return { status: "SUCCEEDED" };
    }
  },
  stripe: {
    async createIntent() {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error("STRIPE_SECRET_KEY is not configured");
      }
      throw new Error("Stripe provider is not yet implemented");
    },
    async confirmIntent() {
      throw new Error("Stripe provider is not yet implemented");
    }
  }
};

export function getPaymentProvider() {
  const name = process.env.PAYMENT_PROVIDER || "manual";
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown payment provider: ${name}`);
  }
  return { name, ...provider };
}

export function getPlatformCommissionRate(artistCommissionRate) {
  if (artistCommissionRate !== undefined && artistCommissionRate !== null) {
    return Number(artistCommissionRate);
  }
  return Number(process.env.PLATFORM_COMMISSION_RATE || 15);
}
