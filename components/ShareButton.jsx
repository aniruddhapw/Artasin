"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Resolves a site-relative path to an absolute URL.
 *
 * NEXT_PUBLIC_SITE_URL is inlined at build time so the first render matches the
 * server and nothing flashes. window.location.origin is the runtime fallback for
 * preview deployments or a misconfigured env var, applied after mount so it
 * cannot cause a hydration mismatch.
 */
function useShareUrl(path) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  const [origin, setOrigin] = useState(configured || "");

  useEffect(() => {
    if (!configured || configured.includes("localhost")) {
      setOrigin(window.location.origin);
    }
  }, [configured]);

  return `${(origin || "").replace(/\/$/, "")}${path}`;
}

export function ShareButton({ path, title, text, label = "Share", className = "button button-secondary" }) {
  const url = useShareUrl(path);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canUseNativeShare, setCanUseNativeShare] = useState(false);
  const containerRef = useRef(null);

  // navigator.share only exists on secure origins and mostly on mobile, so the
  // check has to happen after mount rather than during render.
  useEffect(() => {
    setCanUseNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    function onPointerDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function onKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const shareText = text || title || "";
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${url}`)}`;
  const emailHref = `mailto:?subject=${encodeURIComponent(title || "")}&body=${encodeURIComponent(`${shareText}\n\n${url}`)}`;

  async function copyLink() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Older mobile browsers and any non-secure origin land here.
        const field = document.createElement("textarea");
        field.value = url;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        document.execCommand("copy");
        document.body.removeChild(field);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setIsOpen(false);
    } catch {
      // Clipboard refused — leave the sheet open so the link stays selectable.
      setIsOpen(true);
    }
  }

  async function handleClick() {
    if (canUseNativeShare) {
      try {
        await navigator.share({ title, text: shareText, url });
        return;
      } catch (error) {
        // A cancelled share sheet is not an error worth surfacing.
        if (error?.name === "AbortError") {
          return;
        }
      }
    }
    setIsOpen((current) => !current);
  }

  return (
    <div className="share-control" ref={containerRef}>
      <button
        aria-expanded={canUseNativeShare ? undefined : isOpen}
        aria-haspopup={canUseNativeShare ? undefined : "menu"}
        className={className}
        onClick={handleClick}
        type="button"
      >
        <ShareIcon />
        {copied ? "Link copied" : label}
      </button>

      {isOpen ? (
        <div className="share-sheet" role="menu">
          <a
            className="share-sheet-item"
            href={whatsappHref}
            onClick={() => setIsOpen(false)}
            rel="noopener noreferrer"
            role="menuitem"
            target="_blank"
          >
            WhatsApp
          </a>
          <a
            className="share-sheet-item"
            href={emailHref}
            onClick={() => setIsOpen(false)}
            role="menuitem"
          >
            Email
          </a>
          <button className="share-sheet-item" onClick={copyLink} role="menuitem" type="button">
            Copy link
          </button>
          <p className="share-sheet-url" title={url}>
            {url.replace(/^https?:\/\//, "")}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * A link an artist is expected to copy and paste elsewhere, shown in full
 * alongside the share controls.
 */
export function ShareLinkRow({ path, title, text, note }) {
  const url = useShareUrl(path);

  return (
    <div className="share-link-row">
      <div className="share-link-text">
        <p className="share-link-url">{url.replace(/^https?:\/\//, "")}</p>
        {note ? <p className="share-link-note">{note}</p> : null}
      </div>
      <ShareButton className="button button-primary" label="Share" path={path} text={text} title={title} />
    </div>
  );
}

function ShareIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="15" viewBox="0 0 24 24" width="15">
      <path
        d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M12 15V3m0 0L8 7m4-4l4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}
