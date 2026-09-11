"use client";

import Link from "next/link";
import { useState } from "react";
import { formatApiError } from "@/lib/formErrors";
import { useT } from "@/components/i18n/LocaleProvider";

export function ForgotPasswordForm() {
  const t = useT();
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.get("email") })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, "Unable to send a reset link"));
      }
      setSent(true);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <>
        <div className="auth-form-header">
          <h2>{t("auth.checkEmail")}</h2>
        </div>
        <p className="auth-note" style={{ marginTop: 0 }}>
          {t("auth.resetSent")}
        </p>
        <p className="auth-note">
          {t("auth.didntGetIt")}{" "}
          <button className="link-button" onClick={() => setSent(false)} type="button">
            {t("auth.tryAnotherAddress")}
          </button>
          .
        </p>
        <p className="auth-note">
          <Link href="/login">{t("auth.backToSignIn")}</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <div className="auth-form-header">
        <h2>{t("auth.resetTitle")}</h2>
        <p>{t("auth.resetSubtitle")}</p>
      </div>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>{t("auth.email")}</span>
          <input autoComplete="email" name="email" placeholder="name@example.com" required type="email" />
        </label>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        <button className="button button-primary auth-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? t("auth.sending") : t("auth.sendResetLink")}
        </button>
      </form>
      <p className="auth-note">
        {t("auth.rememberedIt")} <Link href="/login">{t("auth.signInLink")}</Link>
      </p>
    </>
  );
}
