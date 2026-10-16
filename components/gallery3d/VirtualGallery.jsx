"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { buildGallery } from "./scene";

/**
 * A walk-through room for the collection's paintings. The Three.js scene lives
 * in ./scene.js; this component owns the overlay UI (info card, works list,
 * help) and talks to the scene through the small API buildGallery returns.
 */
export function VirtualGallery({ paintings }) {
  const mountRef = useRef(null);
  const apiRef = useRef(null);
  const [selected, setSelected] = useState(null);
  // The last painting visited, so Next/Previous carry on from it after its card closes.
  const lastRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    let disposed = false;
    let api = null;

    import("three")
      .then((THREE) => {
        if (disposed) {
          return;
        }
        api = buildGallery(THREE, mount, paintings, {
          onSelect: (index) => {
            if (index !== null) {
              lastRef.current = index;
            }
            setSelected(index);
          },
          onProgress: (loaded) => setProgress(loaded),
          onMove: () => setShowHelp(false)
        });
        apiRef.current = api;
      })
      .catch(() => setFailed(true));

    return () => {
      disposed = true;
      api?.dispose();
      apiRef.current = null;
    };
  }, [paintings]);

  const focus = useCallback(
    (index) => {
      const next = (index + paintings.length) % paintings.length;
      apiRef.current?.focus(next);
      setShowList(false);
      setShowHelp(false);
    },
    [paintings.length]
  );

  // From the entrance, Next starts at the first painting and Previous at the last.
  const step = useCallback(
    (delta) => {
      const last = lastRef.current;
      focus(last === null ? (delta > 0 ? 0 : paintings.length - 1) : last + delta);
    },
    [focus, paintings.length]
  );

  useEffect(() => {
    function onKey(event) {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select")) {
        return;
      }
      if (event.key === "Escape") {
        setShowList(false);
        setSelected(null);
      } else if (event.key === "]" || event.key === "PageDown") {
        step(1);
      } else if (event.key === "[" || event.key === "PageUp") {
        step(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const painting = selected === null ? null : paintings[selected];
  const loading = progress < paintings.length;

  return (
    <div className="walk-stage">
      <div className="walk-canvas" ref={mountRef} />

      {failed ? (
        <div className="walk-empty walk-overlay-full">
          <p>Your browser could not open the 3D gallery.</p>
          <Link className="button button-secondary" href="/gallery">
            Browse the collection instead
          </Link>
        </div>
      ) : null}

      <div className="walk-topbar">
        <Link className="walk-chip" href="/gallery">
          &larr; Collection
        </Link>
        <button className="walk-chip" onClick={() => setShowList((open) => !open)} type="button">
          {showList ? "Close list" : `All works (${paintings.length})`}
        </button>
        <button className="walk-chip" onClick={() => setShowHelp((open) => !open)} type="button">
          {showHelp ? "Hide help" : "Help"}
        </button>
      </div>

      {loading && !failed ? (
        <div aria-live="polite" className="walk-loading">
          Hanging paintings… {progress} / {paintings.length}
        </div>
      ) : null}

      {showHelp ? (
        <div className="walk-help">
          <p className="walk-eyebrow">How to explore</p>
          <ul>
            <li>
              <strong>Look around</strong> — drag anywhere
            </li>
            <li>
              <strong>Walk</strong> — W A S D or arrow keys, or tap the floor
            </li>
            <li>
              <strong>Visit a painting</strong> — click it, or use Next / Previous
            </li>
          </ul>
        </div>
      ) : null}

      {showList ? (
        <nav aria-label="Paintings in this gallery" className="walk-list">
          <ol>
            {paintings.map((item, index) => (
              <li key={item.id}>
                <button
                  className={index === selected ? "is-active" : ""}
                  onClick={() => focus(index)}
                  type="button"
                >
                  <span>{item.title}</span>
                  <small>{item.artistName}</small>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="walk-bottombar">
        {painting ? (
          <article aria-live="polite" className="walk-card">
            <p className="walk-eyebrow">
              {selected + 1} / {paintings.length}
            </p>
            <h2>{painting.title}</h2>
            <p>
              <Link href={`/artist/${painting.artistSlug}`}>{painting.artistName}</Link>
              {painting.year ? `, ${painting.year}` : ""}
            </p>
            <p className="walk-meta">
              {[painting.medium, painting.dimensions].filter(Boolean).join(" · ")}
            </p>
            <div className="walk-card-actions">
              <strong>{painting.price}</strong>
              <Link className="button button-primary" href={`/artwork/${painting.slug}`}>
                View artwork
              </Link>
            </div>
          </article>
        ) : null}
        <div className="walk-nav">
          <button
            aria-label="Previous painting"
            className="walk-chip"
            onClick={() => step(-1)}
            type="button"
          >
            &larr; Previous
          </button>
          <button
            aria-label="Next painting"
            className="walk-chip"
            onClick={() => step(1)}
            type="button"
          >
            Next &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
