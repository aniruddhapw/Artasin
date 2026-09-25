"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatApiError } from "@/lib/formErrors";
import { useT } from "@/components/i18n/LocaleProvider";
import { artworkCategories } from "@/data/artisan";
import { Spinner } from "@/components/Spinner";

const MAX_IMAGES = 5;

export function ArtworkForm({ artwork, verificationStatus }) {
  const t = useT();
  const canPublish = verificationStatus === "APPROVED";
  const router = useRouter();
  const isEditing = Boolean(artwork);
  const [images, setImages] = useState(() => (artwork?.media || []).map((item) => item.url));
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const remainingSlots = MAX_IMAGES - images.length;

  async function handleImageChange(event) {
    const files = Array.from(event.target.files || []);
    // Clear the input so re-picking the same file still fires a change event.
    event.target.value = "";
    if (!files.length) {
      return;
    }
    if (files.length > remainingSlots) {
      setError(t("error.maxImages"));
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
      setImages((current) => [...current, ...uploaded].slice(0, MAX_IMAGES));
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
    }
  }

  function removeImage(index) {
    setImages((current) => current.filter((_, position) => position !== index));
  }

  function moveImage(index, delta) {
    setImages((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) {
        return current;
      }
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!images.length) {
      setError(t("error.noImages"));
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title"));
    const year = formData.get("year");
    const body = {
      title,
      description: formData.get("description"),
      category: formData.get("category"),
      medium: formData.get("medium"),
      dimensions: formData.get("dimensions"),
      year: year ? Number(year) : undefined,
      price: Number(formData.get("price")),
      currency: "INR",
      shipsFrom: formData.get("shipsFrom") || undefined,
      authenticity: formData.get("authenticity") || undefined,
      edition: formData.get("edition") || undefined,
      status: formData.get("status"),
      media: images.map((url, position) => ({
        url,
        alt: position === 0 ? title : `${title} — view ${position + 1}`,
        sortOrder: position
      }))
    };

    try {
      const response = await fetch(isEditing ? `/api/artworks/${artwork.id}` : "/api/artworks", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, t("error.saveArtwork"), t));
      }

      router.push("/studio/artworks");
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
      setIsSubmitting(false);
    }
  }

  return (
    <form className="request-form" onSubmit={handleSubmit}>
      <fieldset>
        <legend>{t("artwork.form.detailsLegend")}</legend>
        <label>
          <span>{t("artwork.form.title")}</span>
          <input
            defaultValue={artwork?.title}
            name="title"
            required
            type="text"
          />
        </label>
        <label>
          <span>{t("artwork.form.description")}</span>
          <textarea defaultValue={artwork?.description} name="description" required rows={4} />
        </label>
        <div className="auth-two-col" data-tour="artwork-details">
          <label>
            <span>{t("artwork.form.category")}</span>
            <select defaultValue={artwork?.category || ""} name="category" required>
              <option disabled value="">
                {t("artwork.form.selectCategory")}
              </option>
              {artworkCategories.map((category) => (
                <option key={category} value={category}>
                  {t(`category.${category}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("artwork.form.medium")}</span>
            <input defaultValue={artwork?.medium} name="medium" placeholder="Oil on Canvas" required type="text" />
          </label>
        </div>
        <div className="auth-two-col">
          <label>
            <span>{t("artwork.form.dimensions")}</span>
            <input defaultValue={artwork?.dimensions} name="dimensions" placeholder="48 x 60 in" required type="text" />
          </label>
          <label>
            <span>{t("artwork.form.year")}</span>
            <input defaultValue={artwork?.year} name="year" type="number" />
          </label>
        </div>
        <div className="auth-two-col">
          <label>
            <span>{t("artwork.form.price")}</span>
            <input defaultValue={artwork ? artwork.priceCents / 100 : ""} min="1" name="price" required step="0.01" type="number" />
          </label>
          <label data-tour="artwork-status">
            <span>{t("artwork.form.status")}</span>
            <select defaultValue={artwork?.status || "DRAFT"} name="status">
              <option value="DRAFT">{t("artwork.form.draft")}</option>
              <option disabled={!canPublish} value="PUBLISHED">
                {canPublish ? t("artwork.form.published") : t("artwork.form.publishedNeedsVerification")}
              </option>
            </select>
          </label>
        </div>
        <div className="auth-two-col">
          <label>
            <span>{t("artwork.form.shipsFrom")}</span>
            <input defaultValue={artwork?.shipsFrom} name="shipsFrom" type="text" />
          </label>
          <label>
            <span>{t("artwork.form.authenticity")}</span>
            <input defaultValue={artwork?.authenticity} name="authenticity" placeholder="Signed Certificate" type="text" />
          </label>
        </div>
        <label>
          <span>{t("artwork.form.edition")}</span>
          <input defaultValue={artwork?.edition} name="edition" type="text" />
        </label>
      </fieldset>

      <fieldset data-tour="artwork-images">
        <legend>{t("artwork.form.imagesLegend")}</legend>
        <label className="upload-box upload-box-stacked">
          <span>
            {isUploading ? (
              <Spinner label={t("artwork.form.uploading")} />
            ) : images.length ? (
              t("artwork.form.addAnotherImage")
            ) : (
              t("artwork.form.uploadImages")
            )}
          </span>
          <small>
            {t("artwork.form.imageHint")}
          </small>
          <input
            accept="image/*"
            disabled={isUploading || remainingSlots <= 0}
            multiple
            onChange={handleImageChange}
            type="file"
          />
        </label>
        {images.length ? (
          <div className={isUploading ? "artwork-image-grid upload-busy" : "artwork-image-grid"}>
            {images.map((url, position) => (
              <div className="artwork-image-card" key={url}>
                <img alt={`Artwork preview ${position + 1}`} src={url} />
                <span className="primary-flag">
                  {position === 0
                    ? t("artwork.form.primary")
                    : t("artwork.form.viewNumber", { number: position + 1 })}
                </span>
                <div className="artwork-image-actions">
                  <button
                    aria-label="Move image earlier"
                    disabled={position === 0}
                    onClick={() => moveImage(position, -1)}
                    type="button"
                  >
                    &#8249;
                  </button>
                  <button
                    aria-label="Move image later"
                    disabled={position === images.length - 1}
                    onClick={() => moveImage(position, 1)}
                    type="button"
                  >
                    &#8250;
                  </button>
                  <button aria-label="Remove image" onClick={() => removeImage(position)} type="button">
                    &times;
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="upload-confirmation">{t("artwork.form.noImages")}</p>
        )}
      </fieldset>

      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <button
        className="button button-primary request-submit"
        data-tour="artwork-submit"
        disabled={isSubmitting || isUploading}
        type="submit"
      >
        {isSubmitting ? (
          <Spinner label={t("common.saving")} />
        ) : isEditing ? (
          t("artwork.form.saveChanges")
        ) : (
          t("artwork.form.create")
        )}
      </button>
    </form>
  );
}
