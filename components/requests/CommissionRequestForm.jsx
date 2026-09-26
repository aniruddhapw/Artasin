"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatApiError } from "@/lib/formErrors";
import { useT } from "@/components/i18n/LocaleProvider";
import { Icon } from "@/components/Icon";
import { Spinner } from "@/components/Spinner";
import { artworkCategories } from "@/data/artisan";

const budgetRanges = [
  { label: "₹5,000 - ₹10,000", min: 5000, max: 10000 },
  { label: "₹10,000 - ₹25,000", min: 10000, max: 25000 },
  { label: "₹25,000 - ₹50,000", min: 25000, max: 50000 },
  { label: "₹50,000+", min: 50000, max: undefined }
];

export function CommissionRequestForm({ artists, preferredArtistId }) {
  const router = useRouter();
  const t = useT();
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
          throw new Error(formatApiError(payload, t("error.uploadFailed"), t));
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
        throw new Error(formatApiError(payload, t("request.form.submitFailed"), t));
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
        <legend>{t("request.form.projectDetails")}</legend>
        <label>
          <span>{t("request.form.projectTitle")}</span>
          <input name="title" placeholder={t("request.form.projectTitlePlaceholder")} required type="text" />
        </label>
        <label>
          <span>{t("request.form.preferredArtist")}</span>
          <select defaultValue={preferredArtistId || ""} name="artistId">
            <option value="">{t("request.form.openToRecommendations")}</option>
            {artists.map((artist) => (
              <option key={artist.id} value={artist.id}>
                {artist.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t("request.form.artworkType")}</span>
          <select defaultValue="" name="artworkType" required>
            <option disabled value="">
              {t("request.form.selectType")}
            </option>
            {artworkCategories.map((type) => (
              <option key={type} value={type}>
                {t(`category.${type}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t("request.form.medium")}</span>
          <input name="medium" placeholder={t("request.form.mediumPlaceholder")} type="text" />
        </label>
        <label>
          <span>{t("request.form.budget")}</span>
          <select defaultValue="" name="budget">
            <option value="">{t("request.form.selectRange")}</option>
            {budgetRanges.map((range) => (
              <option key={range.label} value={range.label}>
                {range.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t("request.form.timeline")}</span>
          <input name="timeline" placeholder={t("request.form.timelinePlaceholder")} type="text" />
        </label>
        <label>
          <span>{t("request.form.concept")}</span>
          <textarea
            minLength={10}
            name="requirements"
            placeholder={t("request.form.conceptPlaceholder")}
            required
            rows={4}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>{t("request.form.references")}</legend>
        <label className="upload-box">
          <Icon name="uploadFile" size={40} />
          <strong>{isUploading ? <Spinner label={t("artwork.form.uploading")} /> : t("request.form.uploadReferences")}</strong>
          <small>{t("request.form.uploadHint")}</small>
          <input accept=".jpg,.jpeg,.png,.pdf" disabled={isUploading} multiple onChange={handleFilesChange} type="file" />
        </label>
        {referenceUrls.length ? (
          <p className="upload-confirmation">{t("request.form.attached", { count: referenceUrls.length })}</p>
        ) : null}
      </fieldset>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <button className="button button-primary request-submit" disabled={isSubmitting || isUploading} type="submit">
        {isSubmitting ? t("request.form.submitting") : t("request.form.submit")}
      </button>
    </form>
  );
}
