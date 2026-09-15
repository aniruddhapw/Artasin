"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { useT } from "@/components/i18n/LocaleProvider";
import { formatApiError } from "@/lib/formErrors";

export function AddToCartButton({ artworkId, isSignedIn, inCart }) {
  const router = useRouter();
  const t = useT();
  const [added, setAdded] = useState(inCart);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    if (!isSignedIn) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (added) {
      router.push("/cart");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artworkId })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, t("cart.addFailed"), t));
      }
      setAdded(true);
      // Refreshes the nav badge, which is rendered on the server.
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button className="button button-secondary" disabled={isSubmitting} onClick={handleClick} type="button">
        {isSubmitting ? <Spinner label={t("cart.adding")} /> : added ? t("cart.viewCart") : t("cart.addToCart")}
      </button>
      {error ? (
        <p className="auth-error auth-error-inline" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
