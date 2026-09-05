"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const disputableStatuses = ["PAID", "IN_PROGRESS", "SHIPPED", "DELIVERED", "COMPLETED"];

export function DisputeAction({ orderId, status }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  if (!disputableStatuses.includes(status)) {
    return null;
  }

  async function handleReport() {
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${orderId}/dispute`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to report this order");
      }
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
      setIsSubmitting(false);
    }
  }

  if (confirming) {
    return (
      <div className="dispute-confirm">
        <p>This flags the order for admin review and pauses fulfillment. Continue?</p>
        {error ? <p className="auth-error auth-error-inline">{error}</p> : null}
        <div className="meeting-form-actions">
          <button className="small-outline" disabled={isSubmitting} onClick={handleReport} type="button">
            {isSubmitting ? "Reporting..." : "Yes, Report Issue"}
          </button>
          <button className="small-outline" onClick={() => setConfirming(false)} type="button">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button className="button button-secondary" onClick={() => setConfirming(true)} type="button">
      Report an Issue
    </button>
  );
}
