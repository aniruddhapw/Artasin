"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { formatApiError } from "@/lib/formErrors";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password"));
    if (password !== String(formData.get("confirmPassword"))) {
      setError("Those passwords don't match");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, "Unable to reset your password"));
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (submitError) {
      setError(submitError.message);
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <>
        <div className="auth-form-header">
          <h2>Invalid Link</h2>
        </div>
        <p className="auth-note" style={{ marginTop: 0 }}>
          This reset link is missing its token. Request a new one from the{" "}
          <Link href="/forgot-password">forgot password</Link> page.
        </p>
      </>
    );
  }

  if (done) {
    return (
      <>
        <div className="auth-form-header">
          <h2>Password Updated</h2>
        </div>
        <p className="auth-note" style={{ marginTop: 0 }}>
          Your password has been reset. Taking you to sign in&hellip;
        </p>
      </>
    );
  }

  return (
    <>
      <div className="auth-form-header">
        <h2>Set a New Password</h2>
        <p>Choose something you haven&rsquo;t used elsewhere.</p>
      </div>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>New Password</span>
          <input
            autoComplete="new-password"
            minLength={8}
            name="password"
            placeholder="At least 8 characters"
            required
            type="password"
          />
        </label>
        <label>
          <span>Confirm New Password</span>
          <input
            autoComplete="new-password"
            minLength={8}
            name="confirmPassword"
            placeholder="Re-enter your new password"
            required
            type="password"
          />
        </label>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        <button className="button button-primary auth-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Updating..." : "Update Password"}
        </button>
      </form>
    </>
  );
}
