/**
 * Razorpay's hosted checkout (checkout.js), loaded at runtime by
 * components/checkout/CheckoutForm.tsx. Only the parts this app uses.
 */

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureResponse {
  error?: { description?: string };
}

interface RazorpayOptions {
  key: string | null;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
  handler: (response: RazorpaySuccessResponse) => void;
}

interface RazorpayCheckout {
  open(): void;
  on(event: "payment.failed", handler: (response: RazorpayFailureResponse) => void): void;
}

interface Window {
  Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout;
}
