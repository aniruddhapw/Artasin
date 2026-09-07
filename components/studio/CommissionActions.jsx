"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CommissionActions({ commissionRequestId, status }) {
  const router = useRouter();
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function updateStatus(nextStatus, quotedPriceCents) {
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/commissions/${commissionRequestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, quotedPriceCents })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to update request");
      }
      setShowQuoteForm(false);
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleQuoteSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const price = Number(formData.get("price"));
    updateStatus("QUOTED", Math.round(price * 100));
  }

  if (status === "ARTIST_REVIEW" || status === "QUOTED") {
    return (
      <div className="commission-actions">
        {showQuoteForm ? (
          <form className="meeting-form" onSubmit={handleQuoteSubmit}>
            <label>
              <span>Quote Price (₹)</span>
              <input min="1" name="price" required step="0.01" type="number" />
            </label>
            {error ? <p className="auth-error auth-error-inline">{error}</p> : null}
            <div className="meeting-form-actions">
              <button className="small-outline" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Sending..." : "Send Quote"}
              </button>
              <button className="small-outline" onClick={() => setShowQuoteForm(false)} type="button">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="meeting-form-actions">
            <button className="small-outline" disabled={isSubmitting} onClick={() => setShowQuoteForm(true)} type="button">
              {status === "QUOTED" ? "Revise Quote" : "Send Quote"}
            </button>
            <button
              className="small-outline"
              disabled={isSubmitting}
              onClick={() => updateStatus("REJECTED")}
              type="button"
            >
              Decline Request
            </button>
          </div>
        )}
      </div>
    );
  }

  if (status === "ACCEPTED") {
    return (
      <div className="commission-actions">
        {error ? <p className="auth-error auth-error-inline">{error}</p> : null}
        <button className="small-outline" disabled={isSubmitting} onClick={() => updateStatus("IN_PROGRESS")} type="button">
          Start Work
        </button>
      </div>
    );
  }

  if (status === "IN_PROGRESS") {
    return (
      <div className="commission-actions">
        {error ? <p className="auth-error auth-error-inline">{error}</p> : null}
        <button className="small-outline" disabled={isSubmitting} onClick={() => updateStatus("FINAL_REVIEW")} type="button">
          Submit for Final Review
        </button>
      </div>
    );
  }

  if (status === "FINAL_REVIEW") {
    return (
      <div className="commission-actions">
        {error ? <p className="auth-error auth-error-inline">{error}</p> : null}
        <button className="small-outline" disabled={isSubmitting} onClick={() => updateStatus("COMPLETED")} type="button">
          Mark Completed
        </button>
      </div>
    );
  }

  return null;
}
