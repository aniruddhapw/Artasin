"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatApiError } from "@/lib/formErrors";
import { ensureSlug, slugify } from "@/lib/slug";

const categories = ["Painting", "Sculpture", "Digital Art", "Photography"];

export function ArtworkForm({ artwork, verificationStatus }) {
  const canPublish = verificationStatus === "APPROVED";
  const router = useRouter();
  const isEditing = Boolean(artwork);
  const [slug, setSlug] = useState(artwork?.slug || "");
  const [slugEdited, setSlugEdited] = useState(isEditing);
  const [imageUrl, setImageUrl] = useState(artwork?.media?.[0]?.url || "");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setIsUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, "Upload failed"));
      }
      setImageUrl(payload.url);
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
    const title = String(formData.get("title"));
    const year = formData.get("year");
    const body = {
      title,
      slug: slug || ensureSlug(title),
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
      media: imageUrl ? [{ url: imageUrl, alt: title, sortOrder: 0 }] : []
    };

    try {
      const response = await fetch(isEditing ? `/api/artworks/${artwork.id}` : "/api/artworks", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, "Unable to save artwork"));
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
        <legend>Artwork Details</legend>
        <label>
          <span>Title</span>
          <input
            defaultValue={artwork?.title}
            name="title"
            onChange={(event) => {
              if (!slugEdited) {
                setSlug(slugify(event.target.value));
              }
            }}
            required
            type="text"
          />
        </label>
        <label>
          <span>URL Slug</span>
          <small className="field-hint">
            The web address for this piece. Generated from the title — edit it if you like. Leave it blank and
            we&rsquo;ll create one for you.
          </small>
          <input
            minLength={3}
            name="slug"
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(event.target.value);
            }}
            pattern="[a-z0-9-]+"
            value={slug}
          />
        </label>
        <label>
          <span>Description</span>
          <textarea defaultValue={artwork?.description} name="description" required rows={4} />
        </label>
        <div className="auth-two-col">
          <label>
            <span>Category</span>
            <select defaultValue={artwork?.category || ""} name="category" required>
              <option disabled value="">
                Select a category...
              </option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Medium</span>
            <input defaultValue={artwork?.medium} name="medium" placeholder="Oil on Canvas" required type="text" />
          </label>
        </div>
        <div className="auth-two-col">
          <label>
            <span>Dimensions</span>
            <input defaultValue={artwork?.dimensions} name="dimensions" placeholder="48 x 60 in" required type="text" />
          </label>
          <label>
            <span>Year</span>
            <input defaultValue={artwork?.year} name="year" type="number" />
          </label>
        </div>
        <div className="auth-two-col">
          <label>
            <span>Price (₹)</span>
            <input defaultValue={artwork ? artwork.priceCents / 100 : ""} min="1" name="price" required step="0.01" type="number" />
          </label>
          <label>
            <span>Status</span>
            <select defaultValue={artwork?.status || "DRAFT"} name="status">
              <option value="DRAFT">Draft</option>
              <option disabled={!canPublish} value="PUBLISHED">
                Published{canPublish ? "" : " (requires verification)"}
              </option>
            </select>
          </label>
        </div>
        <div className="auth-two-col">
          <label>
            <span>Ships From (Optional)</span>
            <input defaultValue={artwork?.shipsFrom} name="shipsFrom" type="text" />
          </label>
          <label>
            <span>Authenticity (Optional)</span>
            <input defaultValue={artwork?.authenticity} name="authenticity" placeholder="Signed Certificate" type="text" />
          </label>
        </div>
        <label>
          <span>Edition (Optional)</span>
          <input defaultValue={artwork?.edition} name="edition" type="text" />
        </label>
      </fieldset>

      <fieldset>
        <legend>Artwork Image</legend>
        <label className="upload-box">
          <span>{isUploading ? "Uploading..." : "Upload Primary Image"}</span>
          <small>JPG, PNG, WEBP, or GIF. Max 8MB. Leave blank to use the gallery placeholder.</small>
          <input accept="image/*" disabled={isUploading} onChange={handleImageChange} type="file" />
        </label>
        {imageUrl ? (
          <div className="artwork-image-preview">
            <img alt="Artwork preview" src={imageUrl} />
          </div>
        ) : null}
      </fieldset>

      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <button className="button button-primary request-submit" disabled={isSubmitting || isUploading} type="submit">
        {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Artwork"}
      </button>
    </form>
  );
}
