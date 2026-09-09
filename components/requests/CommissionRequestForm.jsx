"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatApiError } from "@/lib/formErrors";
import { Icon } from "@/components/Icon";

const artworkTypes = ["Painting", "Sculpture", "Digital Art", "Photography"];
const budgetRanges = [
  { label: "₹5,000 - ₹10,000", min: 5000, max: 10000 },
  { label: "₹10,000 - ₹25,000", min: 10000, max: 25000 },
  { label: "₹25,000 - ₹50,000", min: 25000, max: 50000 },
  { label: "₹50,000+", min: 50000, max: undefined }
];

export function CommissionRequestForm({ artists, preferredArtistId }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [referenceUrls, setReferenceUrls] = useState([]);

  async function handleFilesChange(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }
    setIsUploading(true);
    setError("");
    try {
      const uploaded = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/uploads", { method: "POST", body: formData });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(formatApiError(payload, "Upload failed"));
        }
        uploaded.push(payload.url);
      }
      setReferenceUrls((current) => [...current, ...uploaded]);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const budgetRange = budgetRanges.find((range) => range.label === formData.get("budget"));

    const body = {
      title: formData.get("title"),
      artistId: formData.get("artistId") || undefined,
      artworkType: formData.get("artworkType"),
      medium: formData.get("medium") || undefined,
      budgetMin: budgetRange?.min,
      budgetMax: budgetRange?.max,
      timeline: formData.get("timeline") || undefined,
      requirements: formData.get("requirements"),
      referenceUrls
    };

    try {
      const response = await fetch("/api/commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json();
      if (response.status === 401) {
        router.push("/login?redirect=/requests");
        return;
      }
      if (!response.ok) {
        throw new Error(formatApiError(payload, "Unable to submit request"));
      }

      router.push(`/commissions/${payload.commissionRequest.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
      setIsSubmitting(false);
    }
  }

  return (
    <form className="request-form" onSubmit={handleSubmit}>
      <fieldset>
        <legend>Project Details</legend>
        <label>
          <span>Project Title</span>
          <input name="title" placeholder="e.g., Living Room Centerpiece" required type="text" />
        </label>
        <label>
          <span>Preferred Artist (Optional)</span>
          <select defaultValue={preferredArtistId || ""} name="artistId">
            <option value="">Open to recommendations</option>
            {artists.map((artist) => (
              <option key={artist.id} value={artist.id}>
                {artist.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Artwork Type</span>
          <select defaultValue="" name="artworkType" required>
            <option disabled value="">
              Select a type...
            </option>
            {artworkTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Medium Preference (Optional)</span>
          <input name="medium" placeholder="Oil on Canvas, Bronze, Digital..." type="text" />
        </label>
        <label>
          <span>Estimated Budget (₹)</span>
          <select defaultValue="" name="budget">
            <option value="">Select a range...</option>
            {budgetRanges.map((range) => (
              <option key={range.label} value={range.label}>
                {range.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Desired Timeline</span>
          <input name="timeline" placeholder="e.g., 3-6 months, by December" type="text" />
        </label>
        <label>
          <span>Concept Description</span>
          <textarea
            minLength={10}
            name="requirements"
            placeholder="Describe your vision, subject matter, and the emotional resonance you are looking for..."
            required
            rows={4}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Reference Material</legend>
        <label className="upload-box">
          <Icon name="uploadFile" size={40} />
          <strong>{isUploading ? "Uploading..." : "Upload Reference Images"}</strong>
          <small>Drag and drop or click to browse. Max 5 files (JPG, PNG, PDF).</small>
          <input accept=".jpg,.jpeg,.png,.pdf" disabled={isUploading} multiple onChange={handleFilesChange} type="file" />
        </label>
        {referenceUrls.length ? (
          <p className="upload-confirmation">{referenceUrls.length} reference file(s) attached.</p>
        ) : null}
      </fieldset>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <button className="button button-primary request-submit" disabled={isSubmitting || isUploading} type="submit">
        {isSubmitting ? "Submitting..." : "Submit Request"}
      </button>
    </form>
  );
}
