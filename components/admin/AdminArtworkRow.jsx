"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminArtworkRow({ artworkId }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function archive() {
    setIsSubmitting(true);
    try {
      await fetch(`/api/artworks/${artworkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" })
      });
      router.refresh();
    } finally {
      setIsSubmitting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="artwork-status-actions">
        <button className="small-outline" disabled={isSubmitting} onClick={archive} type="button">
          Confirm Archive
        </button>
        <button className="small-outline" onClick={() => setConfirming(false)} type="button">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button className="small-outline" onClick={() => setConfirming(true)} type="button">
      Archive
    </button>
  );
}
