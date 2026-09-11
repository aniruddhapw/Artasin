"use client";

import { useState } from "react";
import { formatApiError } from "@/lib/formErrors";
import { useT } from "@/components/i18n/LocaleProvider";

export function ChangePasswordForm({ hasPassword }) {
  const t = useT();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const newPassword = String(formData.get("newPassword"));
    if (newPassword !== String(formData.get("confirmPassword"))) {
      setError("Those passwords don't match");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: hasPassword ? formData.get("currentPassword") : undefined,
          newPassword
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, "Unable to update your password"));
      }
      setSuccess(hasPassword ? "Password updated." : "Password set. You can now sign in with it.");
      form.reset();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form account-form" onSubmit={handleSubmit}>
      {hasPassword ? (
        <label>
          <span>{t("account.currentPassword")}</span>
          <input autoComplete="current-password" name="currentPassword" required type="password" />
        </label>
      ) : (
        <p className="account-hint">
          Your account signs in with Google. Set a password below if you&rsquo;d also like to sign in with your
          email address.
        </p>
      )}
      <label>
        <span>{hasPassword ? t("account.newPassword") : t("auth.password")}</span>
        <input
          autoComplete="new-password"
          minLength={8}
          name="newPassword"
          placeholder="At least 8 characters"
          required
          type="password"
        />
      </label>
      <label>
        <span>{t("account.confirmPassword")}</span>
        <input autoComplete="new-password" minLength={8} name="confirmPassword" required type="password" />
      </label>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      {success ? <p className="account-success" role="status">{success}</p> : null}
      <button className="button button-primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? t("common.saving") : hasPassword ? t("account.updatePassword") : t("account.setPassword")}
      </button>
    </form>
  );
}
