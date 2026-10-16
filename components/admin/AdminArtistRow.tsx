"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatApiError } from "@/lib/formErrors";
import { errorMessage } from "@/lib/errorMessage";
import type { VerificationStatus } from "@prisma/client";

/** One row of /admin/artists, as that page builds it. */
export interface AdminArtistRowData {
  id: string;
  displayName: string;
  verificationStatus: VerificationStatus;
  commissionRate: number;
  artworkCount: number;
  owedCents: number;
}

export function AdminArtistRow({ artist }: { artist: AdminArtistRowData }) {
  const router = useRouter();
  // A string while typing; sent as a number.
  const [rate, setRate] = useState<number | string>(artist.commissionRate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleRateSave() {
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/artists/${artist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionRate: Number(rate) })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, "Unable to update rate"));
      }
      router.refresh();
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerification(verificationStatus: VerificationStatus) {
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/artists/${artist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, "Unable to update verification"));
      }
      router.refresh();
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePayout() {
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/artists/${artist.id}/payout`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, "Unable to process payout"));
      }
      router.refresh();
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="admin-artist-row">
      <span>{artist.displayName}</span>
      <span className="admin-verification-control">
        <span className="tag">{artist.verificationStatus}</span>
        {artist.verificationStatus === "PENDING" ? (
          <span className="dispute-actions">
            <button className="small-outline" disabled={isSubmitting} onClick={() => handleVerification("APPROVED")} type="button">
              Approve
            </button>
            <button className="small-outline" disabled={isSubmitting} onClick={() => handleVerification("REJECTED")} type="button">
              Reject
            </button>
          </span>
        ) : null}
      </span>
      <span className="admin-rate-control">
        <input
          max="100"
          min="0"
          onChange={(event) => setRate(event.target.value)}
          step="0.5"
          type="number"
          value={rate}
        />
        %
        <button className="small-outline" disabled={isSubmitting} onClick={handleRateSave} type="button">
          Save
        </button>
      </span>
      <span>{artist.artworkCount}</span>
      <span>${(artist.owedCents / 100).toFixed(2)}</span>
      <span>
        <button className="small-outline" disabled={isSubmitting || artist.owedCents <= 0} onClick={handlePayout} type="button">
          Pay Out
        </button>
      </span>
      {error ? <p className="auth-error auth-error-inline admin-row-error">{error}</p> : null}
    </div>
  );
}
