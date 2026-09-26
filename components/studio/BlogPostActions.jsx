"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";

export function BlogPostActions({ post }) {
  const t = useT();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function updateStatus(nextStatus) {
    setIsSubmitting(true);
    try {
      await fetch(`/api/blog/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`${t("blog.confirmDelete")} "${post.title}"?`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      await fetch(`/api/blog/${post.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="artwork-status-actions">
      <Link className="small-outline" href={`/studio/blog/${post.id}/edit`}>
        {t("common.edit")}
      </Link>
      {post.status === "DRAFT" || post.status === "REJECTED" ? (
        <button
          className="small-outline"
          disabled={isSubmitting}
          onClick={() => updateStatus("PENDING_REVIEW")}
          type="button"
        >
          {t("blog.submitForReview")}
        </button>
      ) : (
        <button className="small-outline" disabled={isSubmitting} onClick={() => updateStatus("DRAFT")} type="button">
          {post.status === "PENDING_REVIEW" ? t("blog.withdraw") : t("blog.unpublish")}
        </button>
      )}
      <button className="small-outline" disabled={isSubmitting} onClick={handleDelete} type="button">
        {t("common.remove")}
      </button>
    </div>
  );
}
