"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useRef, useState } from "react";
import { Spinner } from "@/components/Spinner";
import { useT } from "@/components/i18n/LocaleProvider";
import { formatApiError } from "@/lib/formErrors";

/**
 * A small, fixed toolbar over Tiptap — bold, italic, two heading levels,
 * lists, a quote, links, and inline images. Deliberately not a kitchen-sink
 * editor: this is the same "keep it simple" call the rest of the studio
 * makes, just with formatting instead of none. What the toolbar can produce
 * is exactly what lib/sanitizeBlogHtml.js allows through on save — the two
 * are meant to be read together.
 */
export function RichTextEditor({ content, onChange, placeholder }) {
  const t = useT();
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  // content is read once, as the editor's starting document, and never pushed
  // back in afterward. This form always has the post's saved body available
  // before the form ever renders (the page fetches it server-side, there is
  // no client-side loading state to react to), so there is nothing to sync.
  // Treating it as reactive — comparing content to editor.getHTML() on every
  // render and calling setContent() when they differ — sounds harmless but
  // is not: onUpdate fires on every keystroke, which changes the content
  // prop from the parent, which the comparison then sees as "different" for
  // reasons as small as attribute-order serialization, triggering a full
  // document replace mid-keystroke and silently dropping most of what was
  // typed. Tiptap's own content option already handles the mount-time case.
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
        heading: { levels: [2, 3] }
      }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: placeholder || "" })
    ],
    content: content || "",
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
    editorProps: {
      attributes: { class: "rte-content" }
    }
  });

  if (!editor) {
    return null;
  }

  function openLinkPopover() {
    const existing = editor.getAttributes("link").href || "";
    setLinkValue(existing);
    setIsLinkOpen(true);
  }

  function applyLink() {
    const url = linkValue.trim();
    if (!url) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    setIsLinkOpen(false);
  }

  async function handleImagePick(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    setIsUploadingImage(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, t("error.uploadFailed"), t));
      }
      editor.chain().focus().setImage({ src: payload.url }).run();
    } catch (error) {
      setUploadError(error.message);
    } finally {
      setIsUploadingImage(false);
    }
  }

  return (
    <div className="rte">
      <div className="rte-toolbar" role="toolbar">
        <button
          aria-label={t("blog.editor.bold")}
          aria-pressed={editor.isActive("bold")}
          className={editor.isActive("bold") ? "rte-button is-active" : "rte-button"}
          onClick={() => editor.chain().focus().toggleBold().run()}
          type="button"
        >
          <strong>B</strong>
        </button>
        <button
          aria-label={t("blog.editor.italic")}
          aria-pressed={editor.isActive("italic")}
          className={editor.isActive("italic") ? "rte-button is-active" : "rte-button"}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          type="button"
        >
          <em>I</em>
        </button>
        <span className="rte-divider" />
        <button
          aria-label={t("blog.editor.heading2")}
          aria-pressed={editor.isActive("heading", { level: 2 })}
          className={editor.isActive("heading", { level: 2 }) ? "rte-button is-active" : "rte-button"}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          type="button"
        >
          H2
        </button>
        <button
          aria-label={t("blog.editor.heading3")}
          aria-pressed={editor.isActive("heading", { level: 3 })}
          className={editor.isActive("heading", { level: 3 }) ? "rte-button is-active" : "rte-button"}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          type="button"
        >
          H3
        </button>
        <span className="rte-divider" />
        <button
          aria-label={t("blog.editor.bulletList")}
          aria-pressed={editor.isActive("bulletList")}
          className={editor.isActive("bulletList") ? "rte-button is-active" : "rte-button"}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          type="button"
        >
          &#8226; &#8226;
        </button>
        <button
          aria-label={t("blog.editor.orderedList")}
          aria-pressed={editor.isActive("orderedList")}
          className={editor.isActive("orderedList") ? "rte-button is-active" : "rte-button"}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          type="button"
        >
          1.2.
        </button>
        <button
          aria-label={t("blog.editor.quote")}
          aria-pressed={editor.isActive("blockquote")}
          className={editor.isActive("blockquote") ? "rte-button is-active" : "rte-button"}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          type="button"
        >
          &#8221;
        </button>
        <span className="rte-divider" />
        <button
          aria-label={t("blog.editor.link")}
          aria-pressed={editor.isActive("link")}
          className={editor.isActive("link") ? "rte-button is-active" : "rte-button"}
          onClick={openLinkPopover}
          type="button"
        >
          &#128279;
        </button>
        <button
          aria-label={t("blog.editor.image")}
          className="rte-button"
          disabled={isUploadingImage}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          {isUploadingImage ? <Spinner size={14} /> : "\u{1F5BC}"}
        </button>
        <input
          accept="image/*"
          hidden
          onChange={handleImagePick}
          ref={fileInputRef}
          type="file"
        />
        <span className="rte-divider" />
        <button
          aria-label={t("blog.editor.undo")}
          className="rte-button"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
          type="button"
        >
          &#8630;
        </button>
        <button
          aria-label={t("blog.editor.redo")}
          className="rte-button"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
          type="button"
        >
          &#8631;
        </button>
      </div>

      {isLinkOpen ? (
        <div className="rte-link-popover">
          <input
            autoFocus
            onChange={(event) => setLinkValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyLink();
              } else if (event.key === "Escape") {
                setIsLinkOpen(false);
              }
            }}
            placeholder="https://..."
            type="text"
            value={linkValue}
          />
          <button className="small-outline" onClick={applyLink} type="button">
            {t("blog.editor.applyLink")}
          </button>
          <button className="small-outline" onClick={() => setIsLinkOpen(false)} type="button">
            {t("common.cancel")}
          </button>
        </div>
      ) : null}

      {uploadError ? (
        <p className="auth-error auth-error-inline" role="alert">
          {uploadError}
        </p>
      ) : null}

      <EditorContent editor={editor} />
    </div>
  );
}
