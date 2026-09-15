"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";

export function RemoveFromCartButton({ artworkId }) {
  const router = useRouter();
  const t = useT();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
    setIsSubmitting(true);
    await fetch(`/api/cart/${artworkId}`, { method: "DELETE" });
    router.refresh();
    setIsSubmitting(false);
  }

  return (
    <button className="small-outline" disabled={isSubmitting} onClick={handleClick} type="button">
      {isSubmitting ? t("common.saving") : t("common.remove")}
    </button>
  );
}
