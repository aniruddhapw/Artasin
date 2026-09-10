"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 6;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Full-screen image viewer with wheel, pinch, double-tap and toolbar zoom.
 * Shared by artwork listings and artist portfolios.
 */
export function Lightbox({ images, index, onClose, onIndexChange, title }) {

  const stageRef = useRef(null);
  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null);
  const panRef = useRef(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });

  const image = images[index];
  const hasMultiple = images.length > 1;
  const isZoomed = view.scale > 1.01;

  const reset = useCallback(() => setView({ scale: 1, x: 0, y: 0 }), []);

  const step = useCallback(
    (delta) => {
      reset();
      onIndexChange((index + delta + images.length) % images.length);
    },
    [images.length, index, onIndexChange, reset]
  );

  // Keeps the image from being dragged entirely out of view. At scale 1 there is
  // nothing to pan, so the bounds collapse to zero and the image re-centres.
  const clampView = useCallback((next) => {
    const stage = stageRef.current;
    if (!stage) {
      return next;
    }
    const { width, height } = stage.getBoundingClientRect();
    const maxX = Math.max(0, (width * (next.scale - 1)) / 2);
    const maxY = Math.max(0, (height * (next.scale - 1)) / 2);
    return { scale: next.scale, x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) };
  }, []);

  // Zooms toward a focal point so the pixel under the cursor/fingers stays put.
  const zoomToward = useCallback(
    (nextScale, focalX, focalY) => {
      setView((current) => {
        const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
        const ratio = scale / current.scale;
        return clampView({
          scale,
          x: focalX - (focalX - current.x) * ratio,
          y: focalY - (focalY - current.y) * ratio
        });
      });
    },
    [clampView]
  );

  const focalFromEvent = useCallback((clientX, clientY) => {
    const stage = stageRef.current;
    if (!stage) {
      return { x: 0, y: 0 };
    }
    const rect = stage.getBoundingClientRect();
    return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
  }, []);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowRight" && images.length > 1) {
        step(1);
      } else if (event.key === "ArrowLeft" && images.length > 1) {
        step(-1);
      } else if (event.key === "+" || event.key === "=") {
        zoomToward(view.scale * 1.4, 0, 0);
      } else if (event.key === "-") {
        zoomToward(view.scale / 1.4, 0, 0);
      } else if (event.key === "0") {
        reset();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [images.length, onClose, reset, step, view.scale, zoomToward]);

  // Locks background scrolling while the overlay is up.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // React attaches wheel listeners passively, so preventDefault() there is ignored
  // and the page scrolls behind the overlay. Bind it directly instead.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return undefined;
    }
    function onWheel(event) {
      event.preventDefault();
      const focal = focalFromEvent(event.clientX, event.clientY);
      setView((current) => {
        const scale = clamp(current.scale * (event.deltaY < 0 ? 1.18 : 1 / 1.18), MIN_SCALE, MAX_SCALE);
        const ratio = scale / current.scale;
        return clampView({
          scale,
          x: focal.x - (focal.x - current.x) * ratio,
          y: focal.y - (focal.y - current.y) * ratio
        });
      });
    }
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [clampView, focalFromEvent]);

  function handlePointerDown(event) {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    stage.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const pointers = [...pointersRef.current.values()];
    if (pointers.length === 2) {
      const [a, b] = pointers;
      pinchRef.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        scale: view.scale,
        view,
        focal: focalFromEvent((a.x + b.x) / 2, (a.y + b.y) / 2)
      };
      panRef.current = null;
    } else if (pointers.length === 1 && view.scale > 1) {
      panRef.current = { x: event.clientX, y: event.clientY, view };
    }
  }

  function handlePointerMove(event) {
    if (!pointersRef.current.has(event.pointerId)) {
      return;
    }
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pointers = [...pointersRef.current.values()];

    if (pointers.length === 2 && pinchRef.current) {
      const [a, b] = pointers;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const start = pinchRef.current;
      const scale = clamp((start.scale * distance) / (start.distance || 1), MIN_SCALE, MAX_SCALE);
      const ratio = scale / start.view.scale;
      setView(
        clampView({
          scale,
          x: start.focal.x - (start.focal.x - start.view.x) * ratio,
          y: start.focal.y - (start.focal.y - start.view.y) * ratio
        })
      );
      return;
    }

    if (pointers.length === 1 && panRef.current) {
      const start = panRef.current;
      setView(
        clampView({
          scale: start.view.scale,
          x: start.view.x + (event.clientX - start.x),
          y: start.view.y + (event.clientY - start.y)
        })
      );
    }
  }

  function handlePointerUp(event) {
    pointersRef.current.delete(event.pointerId);
    const stage = stageRef.current;
    if (stage?.hasPointerCapture?.(event.pointerId)) {
      stage.releasePointerCapture(event.pointerId);
    }
    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }
    if (pointersRef.current.size === 0) {
      panRef.current = null;
    }
  }

  function handleDoubleClick(event) {
    const focal = focalFromEvent(event.clientX, event.clientY);
    if (isZoomed) {
      reset();
    } else {
      zoomToward(2.5, focal.x, focal.y);
    }
  }

  return (
    <div className="lightbox" role="dialog" aria-label={`${title} — image viewer`} aria-modal="true">
      <div className="lightbox-backdrop" onClick={onClose} />

      <div className="lightbox-bar">
        <p className="lightbox-count">
          {hasMultiple ? `${index + 1} / ${images.length}` : title}
        </p>
        <div className="lightbox-tools">
          <button
            aria-label="Zoom out"
            className="lightbox-button"
            disabled={view.scale <= MIN_SCALE}
            onClick={() => zoomToward(view.scale / 1.4, 0, 0)}
            type="button"
          >
            &minus;
          </button>
          <span className="lightbox-scale">{Math.round(view.scale * 100)}%</span>
          <button
            aria-label="Zoom in"
            className="lightbox-button"
            disabled={view.scale >= MAX_SCALE}
            onClick={() => zoomToward(view.scale * 1.4, 0, 0)}
            type="button"
          >
            +
          </button>
          <button aria-label="Reset zoom" className="lightbox-button" onClick={reset} type="button">
            Reset
          </button>
          <button aria-label="Close viewer" className="lightbox-button" onClick={onClose} type="button">
            &times;
          </button>
        </div>
      </div>

      <div
        className={isZoomed ? "lightbox-stage is-zoomed" : "lightbox-stage"}
        onDoubleClick={handleDoubleClick}
        onPointerCancel={handlePointerUp}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        ref={stageRef}
      >
        <img
          alt={image.alt}
          className="lightbox-image"
          draggable="false"
          src={image.full}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        />
      </div>

      {hasMultiple ? (
        <>
          <button aria-label="Previous image" className="lightbox-nav prev" onClick={() => step(-1)} type="button">
            &#8249;
          </button>
          <button aria-label="Next image" className="lightbox-nav next" onClick={() => step(1)} type="button">
            &#8250;
          </button>
        </>
      ) : null}

      <p className="lightbox-help">
        {isZoomed ? "Drag to move · Double-tap to fit" : "Scroll, pinch, or double-tap to zoom"}
      </p>
    </div>
  );
}
