"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatApiError } from "@/lib/formErrors";

/**
 * Takes a live Journal post down in two clicks, from wherever an admin meets
 * it: the Live list, or the post itself. It uses the same decision as
 * rejecting, so the artist is emailed; a note can be added from the full
 * review page when there is something to explain.
 *
 * `redirectTo` is for the public post page, which stops existing the moment
 * the post is unpublished.
 */
export function UnpublishPostButton({ postId, redirectTo }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function unpublish() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/blog/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "reject" })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, "Could not unpublish this post"));
      }
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    } catch (unpublishError) {
      setError(unpublishError.message);
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="artwork-status-actions">
      {confirming ? (
        <>
          <button className="small-outline" disabled={busy} onClick={unpublish} type="button">
            {busy ? "Unpublishing..." : "Confirm unpublish"}
          </button>
          <button className="small-outline" disabled={busy} onClick={() => setConfirming(false)} type="button">
            Cancel
          </button>
        </>
      ) : (
        <button className="small-outline" onClick={() => setConfirming(true)} type="button">
          Unpublish
        </button>
      )}
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
