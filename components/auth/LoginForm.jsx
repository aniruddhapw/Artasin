"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        throw new Error(payload.error || "Unable to sign in");
      }

      const redirect = searchParams.get("redirect");
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
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>Email Address</span>
          <input
            autoComplete="email"
            defaultValue="collector@example.com"
            name="email"
            placeholder="collector@example.com"
            required
            type="email"
          />
        </label>
        <label>
          <span>Password</span>
          <input
            autoComplete="current-password"
            defaultValue="artisan-demo-password"
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
          <Link href="#">Forgot password?</Link>
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
