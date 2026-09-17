"use client";

import { useEffect } from "react";
import { youtubeEmbedUrl } from "@/lib/youtube";

/**
 * Full-screen YouTube embed. A separate component from Lightbox rather than a
 * video mode bolted onto it — none of Lightbox's zoom/pan/pinch math applies to
 * an iframe, and forcing it in would have made both harder to follow.
 */
export function VideoModal({ videoId, title, onClose }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div aria-label={title} aria-modal="true" className="lightbox video-modal" role="dialog">
      <div className="lightbox-backdrop" onClick={onClose} />
      <div className="lightbox-bar">
        <p className="lightbox-count">{title}</p>
        <div className="lightbox-tools">
          <button aria-label="Close video" className="lightbox-button" onClick={onClose} type="button">
            &times;
          </button>
        </div>
      </div>
      <div className="video-modal-frame">
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          height="100%"
          referrerPolicy="strict-origin-when-cross-origin"
          src={`${youtubeEmbedUrl(videoId)}?autoplay=1&rel=0`}
          title={title}
          width="100%"
        />
      </div>
    </div>
  );
}
