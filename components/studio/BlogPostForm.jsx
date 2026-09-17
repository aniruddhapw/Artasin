"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { useT } from "@/components/i18n/LocaleProvider";
import { formatApiError } from "@/lib/formErrors";

// RichTextEditor is client-only (Tiptap mounts directly onto the DOM), and
// this form is itself already a client component, so there is no server
// render to keep in sync with — loading it dynamically with ssr:false lets
// the editor mount synchronously on first client render instead of leaving a
// brief gap after the page paints where the DOM node does not exist yet and
// anything typed into it is silently lost.
const RichTextEditor = dynamic(
  () => import("@/components/studio/RichTextEditor").then((mod) => mod.RichTextEditor),
  { loading: () => <div className="rte rte-loading" />, ssr: false }
);

const MAX_BODY_LENGTH = 50000;

/**
 * A pre-submit check only — whether the editor has any actual content
 * (visible text, or an image with nothing else). The real, security-relevant
 * sanitization and the matching server-side blank check happen in the API
 * (lib/sanitizeBlogHtml.js), which does not ship to the browser.
 */
function isBlankRichText(html) {
  if (typeof document === "undefined" || !html) {
    return !html;
  }
  const parsed = document.createElement("div");
  parsed.innerHTML = html;
  return !parsed.textContent.trim() && !parsed.querySelector("img");
}

export function BlogPostForm({ post }) {
  const t = useT();
  const router = useRouter();
  const isEditing = Boolean(post);

  const [title, setTitle] = useState(post?.title || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [body, setBody] = useState(post?.body || "");
  const [coverImageUrl, setCoverImageUrl] = useState(post?.coverImageUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleCoverUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
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
        throw new Error(formatApiError(payload, t("error.uploadFailed"), t));
      }
      setCoverImageUrl(payload.url);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
    }
  }

  async function submitAs(status) {
    setError("");

    if (!title.trim()) {
      setError(`${t("blog.form.title")}: ${t("error.required")}`);
      return;
    }
    if (isBlankRichText(body)) {
      setError(`${t("blog.form.body")}: ${t("error.required")}`);
      return;
    }

    setIsSubmitting(true);

    const body_ = {
      title: title.trim(),
      excerpt: excerpt.trim() || undefined,
      body,
      coverImageUrl: coverImageUrl || undefined,
      status
    };

    try {
      const response = await fetch(isEditing ? `/api/blog/${post.id}` : "/api/blog", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body_)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, t("error.savePost"), t));
      }
      router.push("/studio/blog");
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
      setIsSubmitting(false);
    }
  }

  // Two explicit actions (draft / publish) rather than one submit button, so
  // the form itself does nothing on Enter — pressing it in the title field
  // should not silently publish a half-written post.
  function handleSubmit(event) {
    event.preventDefault();
  }

  return (
    <form className="request-form" onSubmit={handleSubmit}>
      <fieldset>
        <legend>{t("blog.form.detailsLegend")}</legend>

        <label>
          <span>{t("blog.form.title")}</span>
          <input
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
            required
            type="text"
            value={title}
          />
        </label>

        <label>
          <span>{t("blog.form.excerpt")}</span>
          <small className="field-hint">{t("blog.form.excerptHint")}</small>
          <textarea
            maxLength={300}
            onChange={(event) => setExcerpt(event.target.value)}
            rows={2}
            value={excerpt}
          />
        </label>

        <label>
          <span>{t("blog.form.body")}</span>
          <RichTextEditor content={body} onChange={setBody} placeholder={t("blog.form.bodyPlaceholder")} />
        </label>
      </fieldset>

      <fieldset>
        <legend>{t("blog.form.coverLegend")}</legend>
        <label className="upload-box upload-box-stacked">
          <span>
            {isUploading ? (
              <Spinner label={t("artwork.form.uploading")} />
            ) : coverImageUrl ? (
              t("portfolio.replacePhoto")
            ) : (
              t("blog.form.uploadCover")
            )}
          </span>
          <small>{t("blog.form.coverHint")}</small>
          <input accept="image/*" disabled={isUploading} onChange={handleCoverUpload} type="file" />
        </label>
        {coverImageUrl ? (
          <div className="artwork-image-preview portfolio-draft-preview">
            <img alt="Cover preview" src={coverImageUrl} />
          </div>
        ) : null}
      </fieldset>

      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="portfolio-form-actions">
        <button
          className="button button-secondary"
          disabled={isSubmitting || isUploading}
          onClick={() => submitAs("DRAFT")}
          type="button"
        >
          {isSubmitting ? <Spinner label={t("common.saving")} /> : t("blog.saveDraft")}
        </button>
        <button
          className="button button-primary"
          disabled={isSubmitting || isUploading}
          onClick={() => submitAs("PUBLISHED")}
          type="button"
        >
          {isSubmitting ? <Spinner label={t("common.saving")} /> : t("blog.publish")}
        </button>
      </div>
    </form>
  );
}
