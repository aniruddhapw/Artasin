"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CheckoutForm({ artworkId, commissionRequestId, defaultEmail }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const shippingAddress = {
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      addressLine1: formData.get("addressLine1"),
      addressLine2: formData.get("addressLine2") || undefined,
      city: formData.get("city"),
      state: formData.get("state"),
      postalCode: formData.get("postalCode"),
      country: formData.get("country")
    };

    try {
      const createResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artworkId, commissionRequestId, shippingAddress })
      });
      const createPayload = await createResponse.json();
      if (!createResponse.ok) {
        throw new Error(createPayload.error || "Unable to create order");
      }

      const payResponse = await fetch(`/api/orders/${createPayload.order.id}/pay`, {
        method: "POST"
      });
      const payPayload = await payResponse.json();
      if (!payResponse.ok) {
        throw new Error(payPayload.error || "Payment could not be completed");
      }

      router.push(`/orders/${createPayload.order.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
      setIsSubmitting(false);
    }
  }

  return (
    <form className="request-form" onSubmit={handleSubmit}>
      <fieldset>
        <legend>Shipping Details</legend>
        <label>
          <span>Full Name</span>
          <input autoComplete="name" name="fullName" required type="text" />
        </label>
        <label>
          <span>Email Address</span>
          <input autoComplete="email" defaultValue={defaultEmail} name="email" required type="email" />
        </label>
        <label>
          <span>Address Line 1</span>
          <input autoComplete="address-line1" name="addressLine1" required type="text" />
        </label>
        <label>
          <span>Address Line 2 (Optional)</span>
          <input autoComplete="address-line2" name="addressLine2" type="text" />
        </label>
        <div className="auth-two-col">
          <label>
            <span>City</span>
            <input autoComplete="address-level2" name="city" required type="text" />
          </label>
          <label>
            <span>State / Province</span>
            <input autoComplete="address-level1" name="state" required type="text" />
          </label>
        </div>
        <div className="auth-two-col">
          <label>
            <span>Postal Code</span>
            <input autoComplete="postal-code" name="postalCode" required type="text" />
          </label>
          <label>
            <span>Country</span>
            <input autoComplete="country-name" name="country" required type="text" />
          </label>
        </div>
      </fieldset>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <button className="button button-primary request-submit" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Processing..." : "Complete Purchase"}
      </button>
    </form>
  );
}
