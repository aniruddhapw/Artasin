"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatApiError } from "@/lib/formErrors";
import { useT } from "@/components/i18n/LocaleProvider";

export function ArtworkStatusActions({ artworkId, status, canPublish }) {
  const t = useT();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function updateStatus(nextStatus) {
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/artworks/${artworkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, "Unable to update artwork"));
      }
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function archiveArtwork() {
    setIsSubmitting(true);
    try {
      await fetch(`/api/artworks/${artworkId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="artwork-status-actions">
      {status === "DRAFT" ? (
        <button
          className="small-outline"
          disabled={isSubmitting || !canPublish}
          onClick={() => updateStatus("PUBLISHED")}
          title={canPublish ? undefined : "Requires admin verification"}
          type="button"
        >
          {t("artworks.publish")}
        </button>
      ) : null}
      {status === "PUBLISHED" ? (
        <button
          className="small-outline"
          disabled={isSubmitting}
          onClick={() => updateStatus("DRAFT")}
          type="button"
        >
          {t("artworks.unpublish")}
        </button>
      ) : null}
      <button className="small-outline" disabled={isSubmitting} onClick={archiveArtwork} type="button">
        {t("artworks.archive")}
      </button>
      {error ? <p className="auth-error auth-error-inline">{error}</p> : null}
    </div>
  );
}
