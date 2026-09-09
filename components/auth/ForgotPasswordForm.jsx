"use client";

import Link from "next/link";
import { useState } from "react";
import { formatApiError } from "@/lib/formErrors";

export function ForgotPasswordForm() {
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
          <h2>Check Your Email</h2>
        </div>
        <p className="auth-note" style={{ marginTop: 0 }}>
          If that email has an account with a password, a reset link is on its way. The link expires in an hour.
        </p>
        <p className="auth-note">
          Didn&rsquo;t get it? Check your spam folder, or{" "}
          <button className="link-button" onClick={() => setSent(false)} type="button">
            try another address
          </button>
          .
        </p>
        <p className="auth-note">
          <Link href="/login">Back to sign in</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <div className="auth-form-header">
        <h2>Reset Password</h2>
        <p>Enter your email and we&rsquo;ll send you a link to set a new password.</p>
      </div>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>Email Address</span>
          <input autoComplete="email" name="email" placeholder="name@example.com" required type="email" />
        </label>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        <button className="button button-primary auth-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
      <p className="auth-note">
        Remembered it? <Link href="/login">Sign in</Link>
      </p>
    </>
  );
}
