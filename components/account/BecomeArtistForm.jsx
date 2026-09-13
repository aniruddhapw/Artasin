"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatApiError } from "@/lib/formErrors";
import { useT } from "@/components/i18n/LocaleProvider";

const disciplines = ["Painting", "Sculpture", "Digital Art", "Photography", "Mixed Media"];

export function BecomeArtistForm({ defaultName }) {
  const t = useT();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [displayName, setDisplayName] = useState(defaultName || "");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const body = {
      displayName: displayName.trim(),
      discipline: formData.get("discipline") || undefined,
      location: formData.get("location") || undefined
    };

    try {
      const response = await fetch("/api/account/become-artist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, t("error.openStudio"), t));
      }
      // The session cookie was reissued with the new role, so a refresh is what
      // lets the rest of the app (and the edge proxy) see the artist account.
      router.refresh();
      router.push("/studio/profile");
    } catch (submitError) {
      setError(submitError.message);
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return (
      <article className="dashboard-card">
        <h2>{t("account.becomeArtist.title")}</h2>
        <p className="field-hint" style={{ marginTop: 0 }}>
          {t("account.becomeArtist.body")}
        </p>
        <button className="button button-primary" onClick={() => setIsOpen(true)} type="button">
          {t("account.becomeArtist.cta")}
        </button>
      </article>
    );
  }

  return (
    <article className="dashboard-card">
      <h2>{t("account.becomeArtist.cta")}</h2>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>{t("auth.studioName")}</span>
          <small className="field-hint">{t("account.becomeArtist.nameHint")}</small>
          <input
            maxLength={160}
            onChange={(event) => setDisplayName(event.target.value)}
            required
            type="text"
            value={displayName}
          />
        </label>
        <div className="auth-two-col">
          <label>
            <span>{t("auth.discipline")}</span>
            <select defaultValue="" name="discipline">
              <option value="">{t("common.selectPlaceholder")}</option>
              {disciplines.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("auth.location")}</span>
            <input name="location" placeholder="Pune, Maharashtra" type="text" />
          </label>
        </div>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        <div className="portfolio-form-actions">
          <button className="button button-secondary" onClick={() => setIsOpen(false)} type="button">
            {t("common.cancel")}
          </button>
          <button className="button button-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? t("account.becomeArtist.opening") : t("account.becomeArtist.openStudio")}
          </button>
        </div>
      </form>
    </article>
  );
}
