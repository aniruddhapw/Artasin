import crypto from "node:crypto";

const RAZORPAY_API = "https://api.razorpay.com/v1";

function razorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
  }
  return { keyId, keySecret };
}

function razorpayAuthHeader() {
  const { keyId, keySecret } = razorpayCredentials();
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

/**
 * Razorpay amounts are in paise, which is exactly what we store in *Cents
 * columns for INR — ₹1 = 100 paise = 100 "cents". No conversion needed.
 */
const providers = {
  manual: {
    clientKey() {
      return null;
    },
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

  razorpay: {
    clientKey() {
      return razorpayCredentials().keyId;
    },

    async createIntent({ amountCents, currency, receipt, notes }) {
      const response = await fetch(`${RAZORPAY_API}/orders`, {
        method: "POST",
        headers: {
          Authorization: razorpayAuthHeader(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: amountCents,
          currency: currency || "INR",
          receipt: receipt?.slice(0, 40),
          notes
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.description || "Razorpay could not create the order");
      }

      return {
        provider: "razorpay",
        providerIntentId: payload.id,
        amountCents,
        currency: payload.currency,
        status: "REQUIRES_PAYMENT"
      };
    },

    /**
     * Razorpay signs `<order_id>|<payment_id>` with the key secret. Verifying
     * it is what proves the browser isn't just claiming the payment happened.
     */
    async confirmIntent({ providerIntentId, paymentId, signature }) {
      if (!providerIntentId || !paymentId || !signature) {
        throw new Error("Missing Razorpay payment details");
      }

      const { keySecret } = razorpayCredentials();
      const expected = crypto
        .createHmac("sha256", keySecret)
        .update(`${providerIntentId}|${paymentId}`)
        .digest("hex");

      const expectedBuffer = Buffer.from(expected);
      const receivedBuffer = Buffer.from(signature);
      const valid =
        expectedBuffer.length === receivedBuffer.length &&
        crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

      if (!valid) {
        throw new Error("Payment signature verification failed");
      }

      // Signature proves authenticity; ask Razorpay what actually happened to
      // the money before we mark the order paid.
      const response = await fetch(`${RAZORPAY_API}/payments/${paymentId}`, {
        headers: { Authorization: razorpayAuthHeader() }
      });
      const payment = await response.json();
      if (!response.ok) {
        throw new Error(payment?.error?.description || "Could not verify the payment with Razorpay");
      }
      if (payment.status !== "captured" && payment.status !== "authorized") {
        throw new Error(`Payment was not successful (status: ${payment.status})`);
      }

      return { status: "SUCCEEDED", providerPaymentId: paymentId, rawPayload: payment };
    }
  },

  stripe: {
    clientKey() {
      return process.env.STRIPE_PUBLISHABLE_KEY || null;
    },
    async createIntent() {
      throw new Error("Stripe provider is not implemented — use PAYMENT_PROVIDER=razorpay");
    },
    async confirmIntent() {
      throw new Error("Stripe provider is not implemented — use PAYMENT_PROVIDER=razorpay");
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

export function verifyRazorpayWebhook(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) {
    return false;
  }
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature);
  return (
    expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export function getPlatformCommissionRate(artistCommissionRate) {
  if (artistCommissionRate !== undefined && artistCommissionRate !== null) {
    return Number(artistCommissionRate);
  }
  return Number(process.env.PLATFORM_COMMISSION_RATE || 15);
}
