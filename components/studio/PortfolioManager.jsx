"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatApiError } from "@/lib/formErrors";
import { useT } from "@/components/i18n/LocaleProvider";

const MAX_PIECES = 24;

const emptyDraft = { title: "", medium: "", year: "", description: "", imageUrl: "" };

export function PortfolioManager({ pieces: initialPieces }) {
  const t = useT();
  const router = useRouter();
  const [pieces, setPieces] = useState(initialPieces);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const isEditing = Boolean(editingId);
  const isFull = pieces.length >= MAX_PIECES && !isEditing;

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleUpload(event) {
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
        throw new Error(formatApiError(payload, "Upload failed"));
      }
      updateDraft("imageUrl", payload.url);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
    }
  }

  function startEdit(piece) {
    setEditingId(piece.id);
    setDraft({
      title: piece.title,
      medium: piece.medium || "",
      year: piece.year ? String(piece.year) : "",
      description: piece.description || "",
      imageUrl: piece.imageUrl
    });
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(emptyDraft);
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!draft.imageUrl) {
      setError("Add a photo of the piece first.");
      return;
    }

    const body = {
      title: draft.title.trim(),
      medium: draft.medium.trim() || undefined,
      year: draft.year ? Number(draft.year) : undefined,
      description: draft.description.trim() || undefined,
      imageUrl: draft.imageUrl
    };

    setIsSaving(true);
    try {
      const response = await fetch(isEditing ? `/api/portfolio/${editingId}` : "/api/portfolio", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, "Unable to save this piece"));
      }

      setPieces((current) =>
        isEditing
          ? current.map((piece) => (piece.id === editingId ? payload.piece : piece))
          : [...current, payload.piece]
      );
      cancelEdit();
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(piece) {
    if (!window.confirm(`Remove "${piece.title}" from your portfolio?`)) {
      return;
    }
    setBusyId(piece.id);
    setError("");
    try {
      const response = await fetch(`/api/portfolio/${piece.id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(formatApiError(await response.json(), "Unable to remove this piece"));
      }
      setPieces((current) => current.filter((row) => row.id !== piece.id));
      if (editingId === piece.id) {
        cancelEdit();
      }
      router.refresh();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleMove(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= pieces.length) {
      return;
    }
    const reordered = [...pieces];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setPieces(reordered);
    setBusyId(pieces[index].id);
    setError("");

    try {
      // Only the two swapped rows change position, so persist just those.
      await Promise.all(
        [index, target].map((position) =>
          fetch(`/api/portfolio/${reordered[position].id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sortOrder: position })
          })
        )
      );
      router.refresh();
    } catch (moveError) {
      setPieces(pieces);
      setError("Could not save the new order. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="portfolio-manager">
      <form className="request-form portfolio-form" onSubmit={handleSubmit}>
        <fieldset>
          <legend>{isEditing ? t("portfolio.editPastWork") : t("portfolio.addPastWork")}</legend>

          <label className="upload-box upload-box-stacked">
            <span>
              {isUploading
                ? t("artwork.form.uploading")
                : draft.imageUrl
                  ? t("portfolio.replacePhoto")
                  : t("portfolio.uploadPhoto")}
            </span>
            <small>
              {t("portfolio.photoHint")}
            </small>
            <input accept="image/*" disabled={isUploading} onChange={handleUpload} type="file" />
          </label>

          {draft.imageUrl ? (
            <div className="artwork-image-preview portfolio-draft-preview">
              <img alt="Portfolio piece preview" src={draft.imageUrl} />
            </div>
          ) : null}

          <label>
            <span>{t("portfolio.pieceTitle")}</span>
            <input
              maxLength={160}
              onChange={(event) => updateDraft("title", event.target.value)}
              placeholder="e.g., Monsoon Study III"
              required
              type="text"
              value={draft.title}
            />
          </label>

          <div className="auth-two-col">
            <label>
              <span>{t("portfolio.medium")}</span>
              <input
                maxLength={160}
                onChange={(event) => updateDraft("medium", event.target.value)}
                placeholder="Watercolour on paper"
                type="text"
                value={draft.medium}
              />
            </label>
            <label>
              <span>{t("portfolio.year")}</span>
              <input
                max={new Date().getFullYear()}
                min="1000"
                onChange={(event) => updateDraft("year", event.target.value)}
                type="number"
                value={draft.year}
              />
            </label>
          </div>

          <label>
            <span>{t("portfolio.notes")}</span>
            <small className="field-hint">
              {t("portfolio.notesHint")}
            </small>
            <textarea
              maxLength={2000}
              onChange={(event) => updateDraft("description", event.target.value)}
              placeholder="Commissioned for a private collection in Pune. Three weeks, painted from family photographs."
              rows={3}
              value={draft.description}
            />
          </label>
        </fieldset>

        {error ? <p className="auth-error" role="alert">{error}</p> : null}

        <div className="portfolio-form-actions">
          {isEditing ? (
            <button className="button button-secondary" onClick={cancelEdit} type="button">
              {t("common.cancel")}
            </button>
          ) : null}
          <button
            className="button button-primary"
            disabled={isSaving || isUploading || isFull}
            type="submit"
          >
            {isSaving ? t("common.saving") : isEditing ? t("artwork.form.saveChanges") : t("portfolio.addToPortfolio")}
          </button>
        </div>
        {isFull ? (
          <p className="upload-confirmation">
            You have reached the {MAX_PIECES}-piece limit. Remove one to add another.
          </p>
        ) : null}
      </form>

      <section className="portfolio-list-section">
        <div className="section-heading inline-heading">
          <h2>{t("portfolio.yourPortfolio")}</h2>
          <span className="artist-directory-count">
            {pieces.length} {pieces.length === 1 ? t("portfolio.piece") : t("portfolio.pieces")}
          </span>
        </div>

        {pieces.length ? (
          <div className="order-history-list">
            {pieces.map((piece, index) => (
              <div className="order-history-row portfolio-row" key={piece.id}>
                <div className="order-history-image">
                  <img alt={piece.title} src={piece.imageUrl} />
                </div>
                <div className="order-history-details">
                  <h3>{piece.title}</h3>
                  <p>
                    {[piece.medium, piece.year].filter(Boolean).join(" · ") || "Past work"}
                  </p>
                  {piece.description ? <p className="portfolio-row-note">{piece.description}</p> : null}
                </div>
                <div className="order-history-meta portfolio-row-actions">
                  <button
                    aria-label="Move earlier"
                    className="small-outline"
                    disabled={index === 0 || busyId === piece.id}
                    onClick={() => handleMove(index, -1)}
                    type="button"
                  >
                    &#8593;
                  </button>
                  <button
                    aria-label="Move later"
                    className="small-outline"
                    disabled={index === pieces.length - 1 || busyId === piece.id}
                    onClick={() => handleMove(index, 1)}
                    type="button"
                  >
                    &#8595;
                  </button>
                  <button className="small-outline" onClick={() => startEdit(piece)} type="button">
                    {t("common.edit")}
                  </button>
                  <button
                    className="small-outline"
                    disabled={busyId === piece.id}
                    onClick={() => handleDelete(piece)}
                    type="button"
                  >
                    {t("common.remove")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">
            {t("portfolio.empty")}
          </p>
        )}
      </section>
    </div>
  );
}
