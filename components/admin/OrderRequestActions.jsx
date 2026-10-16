"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatApiError } from "@/lib/formErrors";

/** Records that an order's payment arrived, or cancels the order. */
export function OrderRequestActions({ orderId, canMarkPaid }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function act(action, confirmation) {
    if (!window.confirm(confirmation)) {
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, "Unable to update the order"));
      }
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="dispute-actions">
      {canMarkPaid ? (
        <button
          className="small-outline"
          disabled={isSubmitting}
          onClick={() =>
            act("markPaid", "Mark as paid? The piece will be marked sold, and the buyer and the artist will be emailed.")
          }
          type="button"
        >
          Mark as paid
        </button>
      ) : null}
      <button
        className="small-outline"
        disabled={isSubmitting}
        onClick={() => act("cancel", "Cancel this order? Nothing is emailed to the buyer.")}
        type="button"
      >
        Cancel order
      </button>
      {error ? <p className="auth-error auth-error-inline">{error}</p> : null}
    </div>
  );
}
