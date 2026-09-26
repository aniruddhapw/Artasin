"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { SignupSuccessModal } from "@/components/auth/SignupSuccessModal";
import { formatApiError } from "@/lib/formErrors";
import { useT } from "@/components/i18n/LocaleProvider";
import { ensureSlug } from "@/lib/slug";

export function SignupForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState(searchParams.get("role") === "artist" ? "ARTIST" : "BUYER");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Set once the account exists. The redirect waits on it so the confirmation
  // is not flashed past on the way to the studio.
  const [createdName, setCreatedName] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const firstName = String(formData.get("firstName"));
    const lastName = String(formData.get("lastName"));

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email: formData.get("email"),
          phone: formData.get("phone"),
          whatsappOptIn: formData.get("whatsappOptIn") === "on",
          newsletterOptIn: formData.get("newsletterOptIn") === "on",
          password: formData.get("password"),
          role,
          artist:
            role === "ARTIST"
              ? {
                  displayName: `${firstName} ${lastName}`,
                  // Transliterates non-Latin names and always yields a valid
                  // slug, so an artist is never blocked from registering.
                  slug: ensureSlug(`${firstName} ${lastName}`, "artist")
                }
              : undefined
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(formatApiError(payload, t("error.createAccount"), t));
      }

      setCreatedName(firstName);
    } catch (submitError) {
      setError(submitError.message);
      setIsSubmitting(false);
    }
  }

  const isArtist = role === "ARTIST";

  function leave(destination) {
    router.push(destination);
    router.refresh();
  }

  return (
    <>
      {createdName ? (
        <SignupSuccessModal
          firstName={createdName}
          isArtist={isArtist}
          onDismiss={() => leave(isArtist ? "/studio" : "/account")}
          onPrimary={() => leave(isArtist ? "/studio?tour=1" : "/gallery")}
        />
      ) : null}
      <div className="auth-form-header">
        <h2>{t("auth.signUp.title")}</h2>
        <p>
          {t("auth.alreadyRegistered")} <Link href="/login">{t("auth.signInLink")}</Link>
        </p>
      </div>
      <GoogleButton />
      <p className="auth-google-note">{t("auth.googleNote")}</p>
      <div className="auth-divider">
        <span>{t("auth.or")}</span>
      </div>
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="role-grid" aria-label={t("auth.accountType")}>
          <label>
            <input
              checked={role === "BUYER"}
              name="role"
              onChange={() => setRole("BUYER")}
              type="radio"
              value="BUYER"
            />
            <span>
              <strong>{t("auth.collector")}</strong>
              <small>{t("auth.collectorBlurb")}</small>
            </span>
          </label>
          <label>
            <input
              checked={role === "ARTIST"}
              name="role"
              onChange={() => setRole("ARTIST")}
              type="radio"
              value="ARTIST"
            />
            <span>
              <strong>{t("auth.artist")}</strong>
              <small>{t("auth.artistBlurb")}</small>
            </span>
          </label>
        </div>
        <div className="auth-two-col">
          <label>
            <span>{t("auth.firstName")}</span>
            <input autoComplete="given-name" name="firstName" placeholder="Elena" required type="text" />
          </label>
          <label>
            <span>{t("auth.lastName")}</span>
            <input autoComplete="family-name" name="lastName" placeholder="Rossi" required type="text" />
          </label>
        </div>
        <label>
          <span>{t("auth.email")}</span>
          <input autoComplete="email" name="email" placeholder="name@example.com" required type="email" />
        </label>
        <label>
          <span>{t("auth.phone")}</span>
          <input autoComplete="tel" name="phone" placeholder="+91 98765 43210" required type="tel" />
        </label>
        <label className="check-row">
          <input name="whatsappOptIn" type="checkbox" />
          <span>{t("auth.whatsappOptIn")}</span>
        </label>
        <label>
          <span>{t("auth.password")}</span>
          <input
            autoComplete="new-password"
            minLength={8}
            name="password"
            placeholder={t("auth.atLeast8")}
            required
            type="password"
          />
        </label>
        <label className="check-row">
          {/* Ticked to start with: everyone gets updates unless they say no. */}
          <input defaultChecked name="newsletterOptIn" type="checkbox" />
          <span>{t("auth.newsletterOptIn")}</span>
        </label>
        <label className="check-row">
          <input name="terms" required type="checkbox" />
          <span>{t("auth.terms")}</span>
        </label>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        <button className="button button-primary auth-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? t("auth.creatingAccount") : t("auth.createAccount")}
        </button>
      </form>
    </>
  );
}
