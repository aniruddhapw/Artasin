"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatApiError } from "@/lib/formErrors";

/**
 * Approve or reject a Journal post. The note is optional but is what the
 * artist reads, so a rejection says why.
 */
export function BlogReviewPanel({ postId, status }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  if (status === "DRAFT") {
    return <p className="admin-review-hint">The artist has not submitted this post yet.</p>;
  }

  async function decide(decision) {
    setBusy(decision);
    setError("");
    try {
      const response = await fetch(`/api/admin/blog/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note: note.trim() || undefined })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, "Could not save the decision"));
      }
      setDone(decision === "approve" ? "Approved. The post is live and the artist has been emailed." : "Rejected. The artist has been emailed.");
      setNote("");
      router.refresh();
    } catch (decisionError) {
      setError(decisionError.message);
    } finally {
      setBusy("");
    }
  }

  const isLive = status === "PUBLISHED";

  return (
    <div className="admin-review-actions">
      {status !== "PUBLISHED" ? (
        <button className="button button-primary" disabled={Boolean(busy)} onClick={() => decide("approve")} type="button">
          {busy === "approve" ? "Approving..." : "Approve and publish"}
        </button>
      ) : null}

      {status !== "REJECTED" ? (
        <>
          <label className="admin-review-note-field">
            <span>Note to the artist (optional)</span>
            <textarea
              id="review-note"
              maxLength={1000}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. This reads as a listing. Please add it to your studio as an artwork instead."
              rows={4}
              value={note}
            />
          </label>
          <button className="button button-secondary" disabled={Boolean(busy)} onClick={() => decide("reject")} type="button">
            {busy === "reject" ? "Saving..." : isLive ? "Take down" : "Reject"}
          </button>
        </>
      ) : null}

      {done ? (
        <p className="admin-review-hint" role="status">
          {done}
        </p>
      ) : null}
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
