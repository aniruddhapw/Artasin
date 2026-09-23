"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminArtworkRow({ artworkId, status, isHero }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function updateStatus(nextStatus) {
    setIsSubmitting(true);
    try {
      await fetch(`/api/artworks/${artworkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      router.refresh();
    } finally {
      setIsSubmitting(false);
      setConfirming(false);
    }
  }

  async function setHero(pinned) {
    setIsSubmitting(true);
    try {
      await fetch("/api/admin/hero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artworkId: pinned ? artworkId : null })
      });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  if (confirming) {
    return (
      <div className="artwork-status-actions">
        <button className="small-outline" disabled={isSubmitting} onClick={() => updateStatus("ARCHIVED")} type="button">
          Confirm Archive
        </button>
        <button className="small-outline" onClick={() => setConfirming(false)} type="button">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="artwork-status-actions">
      {status === "PUBLISHED" ? (
        <button
          className="small-outline"
          disabled={isSubmitting}
          onClick={() => setHero(!isHero)}
          type="button"
        >
          {isHero ? "Unset Hero" : "Set as Hero"}
        </button>
      ) : null}
      {status === "PUBLISHED" ? (
        <button
          className="small-outline"
          disabled={isSubmitting}
          onClick={() => updateStatus("DRAFT")}
          type="button"
        >
          Unpublish
        </button>
      ) : null}
      <button className="small-outline" onClick={() => setConfirming(true)} type="button">
        Archive
      </button>
    </div>
  );
}
