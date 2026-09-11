"use client";

import { useCallback, useState } from "react";
import { Lightbox } from "@/components/artwork/Lightbox";
import { LazyImage } from "@/components/LazyImage";

export function ArtworkGallery({ images, title }) {
  const [index, setIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const active = images[index] || images[0];
  const hasMultiple = images.length > 1;

  const open = useCallback((at) => {
    setIndex(at);
    setIsOpen(true);
  }, []);

  return (
    <div className="artwork-gallery">
      <button
        aria-label={`Zoom in on ${title}`}
        className="detail-image-frame artwork-gallery-main"
        onClick={() => open(index)}
        type="button"
      >
        <LazyImage alt={active.alt} priority src={active.src} />
        <span className="artwork-zoom-hint" aria-hidden="true">
          <ZoomIcon />
          Click to zoom
        </span>
      </button>

      {hasMultiple ? (
        <div className="artwork-thumbs">
          {images.map((image, thumbIndex) => (
            <button
              aria-current={thumbIndex === index}
              aria-label={`View image ${thumbIndex + 1} of ${images.length}`}
              className={thumbIndex === index ? "artwork-thumb is-active" : "artwork-thumb"}
              key={image.src}
              onClick={() => setIndex(thumbIndex)}
              type="button"
            >
              <LazyImage alt="" src={image.thumb} />
            </button>
          ))}
        </div>
      ) : null}

      {isOpen ? (
        <Lightbox
          images={images}
          index={index}
          onClose={() => setIsOpen(false)}
          onIndexChange={setIndex}
          title={title}
        />
      ) : null}
    </div>
  );
}

function ZoomIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 16l5 5M11 8v6M8 11h6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}
