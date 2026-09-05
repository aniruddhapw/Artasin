"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProfileForm({ artistProfile }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess(false);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const body = {
      displayName: formData.get("displayName"),
      bio: formData.get("bio") || undefined,
      discipline: formData.get("discipline") || undefined,
      location: formData.get("location") || undefined,
      website: formData.get("website") || undefined
    };

    try {
      const response = await fetch("/api/studio/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to save profile");
      }
      setSuccess(true);
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="request-form" onSubmit={handleSubmit}>
      <fieldset>
        <legend>Studio Profile</legend>
        <label>
          <span>Display Name</span>
          <input defaultValue={artistProfile.displayName} name="displayName" required type="text" />
        </label>
        <label>
          <span>Bio</span>
          <textarea defaultValue={artistProfile.bio || ""} name="bio" rows={4} />
        </label>
        <div className="auth-two-col">
          <label>
            <span>Discipline</span>
            <input defaultValue={artistProfile.discipline || ""} name="discipline" placeholder="Oil on Canvas" type="text" />
          </label>
          <label>
            <span>Location</span>
            <input defaultValue={artistProfile.location || ""} name="location" placeholder="Milan" type="text" />
          </label>
        </div>
        <label>
          <span>Website (Optional)</span>
          <input defaultValue={artistProfile.website || ""} name="website" placeholder="https://" type="url" />
        </label>
      </fieldset>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      {success ? <p className="upload-confirmation">Profile updated.</p> : null}
      <button className="button button-primary request-submit" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Saving..." : "Save Profile"}
      </button>
    </form>
  );
}
