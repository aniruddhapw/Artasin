"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { formatApiError } from "@/lib/formErrors";
import { GoogleButton } from "@/components/auth/GoogleButton";

const oauthErrors = {
  google_auth_failed: "Google Sign-In failed. Please try again.",
  google_email_unverified: "That Google account's email isn't verified.",
  google_not_configured: "Google Sign-In isn't available right now."
};

export function LoginForm() {
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
        <h2>Sign In</h2>
        <p>
          New to ARTISAN? <Link href="/signup">Create an account</Link>
        </p>
      </div>
      <GoogleButton redirect={redirect} />
      <div className="auth-divider">
        <span>or</span>
      </div>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>Email Address</span>
          <input
            autoComplete="email"
            name="email"
            placeholder="name@example.com"
            required
            type="email"
          />
        </label>
        <label>
          <span>Password</span>
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
            <span>Keep me signed in</span>
          </label>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        <button className="button button-primary auth-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Signing In..." : "Sign In"}
        </button>
      </form>
      <p className="auth-note">
        Artist dashboards and collector accounts use the same secure sign-in.
      </p>
    </>
  );
}
