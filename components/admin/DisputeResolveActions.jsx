"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatApiError } from "@/lib/formErrors";

export function DisputeResolveActions({ orderId }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function resolve(resolution) {
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, "Unable to resolve dispute"));
      }
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="dispute-actions">
      <button className="small-outline" disabled={isSubmitting} onClick={() => resolve("refund")} type="button">
        Refund
      </button>
      <button className="small-outline" disabled={isSubmitting} onClick={() => resolve("dismiss")} type="button">
        Dismiss
      </button>
      {error ? <p className="auth-error auth-error-inline">{error}</p> : null}
    </div>
  );
}
