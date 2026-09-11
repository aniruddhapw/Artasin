"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { formatApiError } from "@/lib/formErrors";
import { useT } from "@/components/i18n/LocaleProvider";
import { GoogleButton } from "@/components/auth/GoogleButton";

const oauthErrors = {
  google_auth_failed: "Google Sign-In failed. Please try again.",
  google_email_unverified: "That Google account's email isn't verified.",
  google_not_configured: "Google Sign-In isn't available right now."
};

export function LoginForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState(oauthErrors[searchParams.get("error")] || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirect = searchParams.get("redirect");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password")
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(formatApiError(payload, "Unable to sign in"));
      }

      const fallback = payload.user.role === "ARTIST" ? "/studio" : "/";
      router.push(redirect && redirect.startsWith("/") ? redirect : fallback);
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="auth-form-header">
        <h2>{t("auth.signIn.title")}</h2>
        <p>
          {t("auth.newHere")} <Link href="/signup">{t("auth.createAccountLink")}</Link>
        </p>
      </div>
      <GoogleButton redirect={redirect} />
      <div className="auth-divider">
        <span>{t("auth.or")}</span>
      </div>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>{t("auth.email")}</span>
          <input
            autoComplete="email"
            name="email"
            placeholder="name@example.com"
            required
            type="email"
          />
        </label>
        <label>
          <span>{t("auth.password")}</span>
          <input
            autoComplete="current-password"
            name="password"
            placeholder="Enter your password"
            required
            type="password"
          />
        </label>
        <div className="auth-options">
          <label className="check-row">
            <input name="remember" type="checkbox" />
            <span>{t("auth.keepSignedIn")}</span>
          </label>
          <Link href="/forgot-password">{t("auth.forgotShort")}</Link>
        </div>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        <button className="button button-primary auth-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? t("auth.signingIn") : t("auth.signIn.title")}
        </button>
      </form>
      <p className="auth-note">
        {t("auth.sharedAccountNote")}
      </p>
    </>
  );
}
