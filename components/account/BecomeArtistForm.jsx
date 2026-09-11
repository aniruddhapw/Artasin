"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatApiError } from "@/lib/formErrors";
import { ensureSlug, slugify } from "@/lib/slug";

const disciplines = ["Painting", "Sculpture", "Digital Art", "Photography", "Mixed Media"];

export function BecomeArtistForm({ defaultName }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [displayName, setDisplayName] = useState(defaultName || "");
  const [slug, setSlug] = useState(slugify(defaultName || ""));
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const body = {
      displayName: displayName.trim(),
      slug: slug || ensureSlug(displayName, "artist"),
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
        throw new Error(formatApiError(payload, "Unable to open your studio"));
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
        <h2>Sell Your Own Work</h2>
        <p className="field-hint" style={{ marginTop: 0 }}>
          You are set up as a collector. If you also make art, you can open a studio on this same account — you
          keep your order history and sign in exactly as you do now. An admin reviews new studios before you can
          publish work for sale, but you can build your portfolio straight away.
        </p>
        <button className="button button-primary" onClick={() => setIsOpen(true)} type="button">
          Open an Artist Studio
        </button>
      </article>
    );
  }

  return (
    <article className="dashboard-card">
      <h2>Open an Artist Studio</h2>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>Studio Name</span>
          <small className="field-hint">The name collectors will see on your work.</small>
          <input
            maxLength={160}
            onChange={(event) => {
              setDisplayName(event.target.value);
              if (!slugEdited) {
                setSlug(slugify(event.target.value));
              }
            }}
            required
            type="text"
            value={displayName}
          />
        </label>
        <label>
          <span>Studio URL</span>
          <small className="field-hint">artasin.in/artist/{slug || "your-name"}</small>
          <input
            minLength={3}
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(event.target.value);
            }}
            pattern="[a-z0-9-]+"
            value={slug}
          />
        </label>
        <div className="auth-two-col">
          <label>
            <span>Discipline (Optional)</span>
            <select defaultValue="" name="discipline">
              <option value="">Select...</option>
              {disciplines.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Location (Optional)</span>
            <input name="location" placeholder="Pune, Maharashtra" type="text" />
          </label>
        </div>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        <div className="portfolio-form-actions">
          <button className="button button-secondary" onClick={() => setIsOpen(false)} type="button">
            Cancel
          </button>
          <button className="button button-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Opening..." : "Open Studio"}
          </button>
        </div>
      </form>
    </article>
  );
}
