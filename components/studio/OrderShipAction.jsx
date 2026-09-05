"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const nextStatusByStatus = {
  PAID: { label: "Start Fulfillment", next: "IN_PROGRESS" },
  IN_PROGRESS: { label: "Mark Shipped", next: "SHIPPED" },
  SHIPPED: { label: "Mark Delivered", next: "DELIVERED" }
};

export function OrderShipAction({ orderId, status }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const action = nextStatusByStatus[status];
  if (!action) {
    return null;
  }

  async function handleClick() {
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action.next })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to update order");
      }
      router.refresh();
    } catch (updateError) {
      setError(updateError.message);
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button className="small-outline" disabled={isSubmitting} onClick={handleClick} type="button">
        {isSubmitting ? "Updating..." : action.label}
      </button>
      {error ? <p className="auth-error auth-error-inline">{error}</p> : null}
    </>
  );
}
