"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { useT } from "@/components/i18n/LocaleProvider";
import { formatApiError } from "@/lib/formErrors";
import { thumbUrl } from "@/lib/images";

const ACCEPTED = "image/jpeg,image/png,image/webp";

/**
 * A photo of the artist for Artasin's Instagram. Never shown on the site, so
 * the form says so plainly, and asks for permission before it saves.
 */
export function PromoPhotoForm({ photo }) {
  const t = useT();
  const router = useRouter();
  const [savedUrl, setSavedUrl] = useState(photo?.url || "");
  const [pendingUrl, setPendingUrl] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const previewUrl = pendingUrl || savedUrl;

  async function handleFile(event) {
    const file = event.target.files?.[0];
    // Clear the input so picking the same file again still fires a change.
    event.target.value = "";
    if (!file) {
      return;
    }
    setBusy("upload");
    setError("");
    setNotice("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, t("error.uploadFailed"), t));
      }
      setPendingUrl(payload.url);
      setConsent(false);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setBusy("");
    }
  }

  async function save() {
    setBusy("save");
    setError("");
    try {
      const response = await fetch("/api/studio/promo-photo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: pendingUrl, consent })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, t("promoPhoto.saveError"), t));
      }
      setSavedUrl(payload.photo.url);
      setPendingUrl("");
      setNotice(t("promoPhoto.saved"));
      router.refresh();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    if (!window.confirm(t("promoPhoto.confirmRemove"))) {
      return;
    }
    setBusy("remove");
    setError("");
    try {
      const response = await fetch("/api/studio/promo-photo", { method: "DELETE" });
      if (!response.ok) {
        throw new Error(formatApiError(await response.json(), t("promoPhoto.saveError"), t));
      }
      setSavedUrl("");
      setNotice(t("promoPhoto.removed"));
      router.refresh();
    } catch (removeError) {
      setError(removeError.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="request-form promo-photo">
      <fieldset>
        <legend>{t("promoPhoto.title")}</legend>
        <p className="promo-photo-intro">{t("promoPhoto.intro")}</p>
        <p className="promo-photo-private">{t("promoPhoto.private")}</p>

        <div className="promo-photo-body">
          {previewUrl ? (
            <img alt={t("promoPhoto.previewAlt")} className="promo-photo-preview" src={thumbUrl(previewUrl)} />
          ) : null}

          <div className="promo-photo-controls">
            <label className="upload-box upload-box-stacked">
              <span>
                {busy === "upload" ? (
                  <Spinner label={t("artwork.form.uploading")} />
                ) : previewUrl ? (
                  t("promoPhoto.replace")
                ) : (
                  t("promoPhoto.upload")
                )}
              </span>
              <small>{t("promoPhoto.hint")}</small>
              <input accept={ACCEPTED} disabled={Boolean(busy)} onChange={handleFile} type="file" />
            </label>

            {pendingUrl ? (
              <>
                <label className="check-row">
                  <input checked={consent} onChange={(event) => setConsent(event.target.checked)} type="checkbox" />
                  <span>{t("promoPhoto.consent")}</span>
                </label>
                <div className="promo-photo-actions">
                  <button className="button button-primary" disabled={!consent || Boolean(busy)} onClick={save} type="button">
                    {busy === "save" ? t("common.saving") : t("promoPhoto.save")}
                  </button>
                  <button className="small-outline" disabled={Boolean(busy)} onClick={() => setPendingUrl("")} type="button">
                    {t("common.cancel")}
                  </button>
                </div>
              </>
            ) : savedUrl ? (
              <div className="promo-photo-actions">
                <button className="small-outline" disabled={Boolean(busy)} onClick={remove} type="button">
                  {busy === "remove" ? t("common.saving") : t("promoPhoto.remove")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </fieldset>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      {notice ? <p className="upload-confirmation" role="status">{notice}</p> : null}
    </section>
  );
}
