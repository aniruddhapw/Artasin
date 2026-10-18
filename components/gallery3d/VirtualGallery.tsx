"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ShareButton } from "@/components/ShareButton";
import { HelperPanel, type HelperStep } from "./HelperPanel";
import { buildGallery } from "./scene";
import type { GalleryApi, GalleryInsets, GalleryPainting } from "./types";

/**
 * A walk-through room for the collection's paintings. The Three.js scene lives
 * in ./scene.js; this component owns the overlay UI (info card, works list,
 * help) and talks to the scene through the small API buildGallery returns.
 *
 * `startAt` (a painting's slug, from /gallery/walk?at=...) opens the gallery
 * standing in front of that painting, so a link can point at one work. While
 * a painting is in view the address bar carries its ?at=, so copying the URL
 * shares it too.
 */
export function VirtualGallery({ paintings, startAt }: { paintings: readonly GalleryPainting[]; startAt?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<GalleryApi | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const topbarRef = useRef<HTMLDivElement>(null);
  const bottombarRef = useRef<HTMLDivElement>(null);
  // Latest overlay insets, kept so they can be applied once the scene exists.
  const insetsRef = useRef<GalleryInsets>({ top: 0, bottom: 0 });
  const [selected, setSelected] = useState<number | null>(null);
  // The last painting visited, so Next/Previous carry on from it after its card closes.
  const lastRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const [showList, setShowList] = useState(false);
  const [showVisitors, setShowVisitors] = useState(true);
  const showVisitorsRef = useRef(true);
  const [helperStep, setHelperStep] = useState<HelperStep | null>(null);
  const helperOpen = helperStep !== null;
  // Paintings the helper is walking the visitor through, and where they are in them.
  const [tour, setTour] = useState<{ indices: number[]; position: number } | null>(null);
  const selectedRef = useRef<number | null>(null);

  const openHelper = useCallback(
    (step?: HelperStep) => {
      const current = selectedRef.current;
      const onPainting = current !== null && current < paintings.length;
      setHelperStep(step ?? (onPainting ? { kind: "about", index: current } : { kind: "home" }));
      setShowList(false);
      setShowHelp(false);
    },
    [paintings.length]
  );

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }
    let disposed = false;
    let api: GalleryApi | null = null;

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
            selectedRef.current = index;
            setSelected(index);
          },
          // Clicking the helper asks about the painting in front of you, if there is one.
          onHelper: () => openHelper(),
          onProgress: (loaded) => setProgress(loaded),
          onMove: () => setShowHelp(false)
        });
        apiRef.current = api;
        api.setInsets(insetsRef.current);
        api.setVisitorsVisible(showVisitorsRef.current);
        const startIndex = startAt ? paintings.findIndex((item) => item.slug === startAt) : -1;
        if (startIndex >= 0) {
          api.focus(startIndex, { instant: true });
          setShowHelp(false);
        }
      })
      .catch(() => setFailed(true));

    return () => {
      disposed = true;
      api?.dispose();
      apiRef.current = null;
    };
  }, [paintings, openHelper, startAt]);

  // Tell the scene how much of the view the bars and card cover, so a focused
  // painting is framed in the clear space between them rather than behind them.
  useEffect(() => {
    const stage = stageRef.current;
    const topbar = topbarRef.current;
    const bottombar = bottombarRef.current;
    if (!stage || !topbar || !bottombar) {
      return;
    }
    function measure() {
      if (!stage || !topbar || !bottombar) {
        return;
      }
      const stageBox = stage.getBoundingClientRect();
      const top = Math.max(0, topbar.getBoundingClientRect().bottom - stageBox.top);
      const wide = (element: Element | null) => Boolean(element && element.getBoundingClientRect().width > stageBox.width * 0.6);
      // On a phone the helper is a sheet across the bottom in place of the
      // card, so the painting is framed above it.
      const helper = stage.querySelector(".walk-helper");
      // The card only blocks the painting when it spans the screen (phones);
      // beside a centred painting on a wide screen, only the buttons count.
      const card = bottombar.querySelector(".walk-card");
      const covering = wide(helper) ? helper : wide(card) ? bottombar : bottombar.querySelector(".walk-nav");
      const bottom = covering ? Math.max(0, stageBox.bottom - covering.getBoundingClientRect().top) : 0;
      const insets = { top: Math.round(top), bottom: Math.round(bottom) };
      insetsRef.current = insets;
      // The help and works panels open just below the buttons, however many
      // rows those wrap onto.
      stage.style.setProperty("--walk-top", `${insets.top}px`);
      apiRef.current?.setInsets(insets);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    observer.observe(topbar);
    observer.observe(bottombar);
    const helper = stage.querySelector(".walk-helper");
    if (helper) {
      observer.observe(helper);
    }
    measure();
    return () => observer.disconnect();
  }, [helperOpen]);

  // Keep ?at= in the address bar in step with the painting in view, without
  // adding history entries for every painting visited.
  useEffect(() => {
    const slug = selected !== null ? paintings[selected]?.slug : undefined;
    const url = new URL(window.location.href);
    if (slug) {
      url.searchParams.set("at", slug);
    } else {
      url.searchParams.delete("at");
    }
    if (url.href !== window.location.href) {
      window.history.replaceState(window.history.state, "", url);
    }
  }, [selected, paintings]);

  useEffect(() => {
    showVisitorsRef.current = showVisitors;
    apiRef.current?.setVisitorsVisible(showVisitors);
  }, [showVisitors]);


  // Stops on the tour: every painting, then the custom-orders desk at the end.
  const deskIndex = paintings.length;
  const stops = paintings.length + 1;

  const focus = useCallback(
    (index: number) => {
      const next = (index + stops) % stops;
      apiRef.current?.focus(next);
      setShowList(false);
      setShowHelp(false);
    },
    [stops]
  );

  // From the entrance, Next starts at the first painting and Previous at the last.
  const step = useCallback(
    (delta: number) => {
      const last = lastRef.current;
      focus(last === null ? (delta > 0 ? 0 : stops - 1) : last + delta);
    },
    [focus, stops]
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select")) {
        return;
      }
      if (event.key === "Escape") {
        setShowList(false);
        setHelperStep(null);
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

  // The helper's suggestions: go to the first and keep the rest for "Next suggestion".
  function goToSuggestions(indices: number[]) {
    const [first] = indices;
    if (first === undefined) {
      return;
    }
    setTour(indices.length > 1 ? { indices, position: 0 } : null);
    setHelperStep(null);
    focus(first);
  }

  function nextSuggestion() {
    if (!tour) {
      return;
    }
    const position = tour.position + 1;
    const index = tour.indices[position];
    if (index === undefined) {
      setTour(null);
      return;
    }
    setTour(position + 1 < tour.indices.length ? { ...tour, position } : null);
    focus(index);
  }

  const painting = selected === null ? null : paintings[selected];
  const atDesk = selected === deskIndex;
  const loading = progress < paintings.length;

  return (
    <div className={helperOpen ? "walk-stage is-helper-open" : "walk-stage"} ref={stageRef}>
      <div className="walk-canvas" ref={mountRef} />

      {failed ? (
        <div className="walk-empty walk-overlay-full">
          <p>Your browser could not open the 3D gallery.</p>
          <Link className="button button-secondary" href="/gallery">
            Browse the collection instead
          </Link>
        </div>
      ) : null}

      <div className="walk-topbar" ref={topbarRef}>
        <Link className="walk-chip" href="/gallery">
          &larr; Collection
        </Link>
        <button
          aria-pressed={helperStep !== null}
          className={helperStep ? "walk-chip is-active" : "walk-chip"}
          onClick={() => (helperStep ? setHelperStep(null) : openHelper())}
          type="button"
        >
          Helper
        </button>
        <button
          className="walk-chip"
          onClick={() => {
            setHelperStep(null);
            setShowList((open) => !open);
          }}
          type="button"
        >
          {showList ? "Close list" : `All works (${paintings.length})`}
        </button>
        <button
          aria-pressed={showVisitors}
          className={showVisitors ? "walk-chip is-active" : "walk-chip"}
          onClick={() => setShowVisitors((on) => !on)}
          type="button"
        >
          Visitors
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
            <li>
              <strong>Need ideas?</strong> — ask the helper with the &ldquo;Ask me&rdquo; tag
            </li>
            <li>
              <strong>Custom orders</strong> — visit the desk in the reception at the far end
            </li>
          </ul>
          {/* The page's introduction and painting list sit below the 3D view,
              which takes the scroll wheel and touch for walking. */}
          <a className="walk-help-more" href="#walk-intro">
            About this gallery and all its paintings &darr;
          </a>
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
            <li className="walk-list-desk">
              <button
                className={atDesk ? "is-active" : ""}
                onClick={() => focus(deskIndex)}
                type="button"
              >
                <span>Custom orders desk</span>
                <small>Commission an original piece</small>
              </button>
            </li>
          </ol>
        </nav>
      ) : null}

      {helperStep ? (
        <HelperPanel
          current={selected !== null && selected < paintings.length ? selected : null}
          onClose={() => setHelperStep(null)}
          onDesk={() => {
            setHelperStep(null);
            focus(deskIndex);
          }}
          onGo={goToSuggestions}
          onStep={setHelperStep}
          paintings={paintings}
          step={helperStep}
        />
      ) : null}

      <div className="walk-bottombar" ref={bottombarRef}>
        {painting ? (
          <article aria-live="polite" className="walk-card">
            <p className="walk-eyebrow">
              {(selected ?? 0) + 1} / {paintings.length}
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
            <div className="walk-card-links">
              <button
                className="walk-card-ask"
                onClick={() => openHelper({ kind: "about", index: selected ?? 0 })}
                type="button"
              >
                Ask the helper about this painting
              </button>
              <ShareButton
                className="walk-card-share"
                label="Share"
                path={`/gallery/walk?at=${encodeURIComponent(painting.slug)}`}
                text={`Walk up to "${painting.title}" by ${painting.artistName} in the ARTASIN 3D gallery`}
                title={`${painting.title} in the ARTASIN 3D gallery`}
              />
            </div>
          </article>
        ) : null}
        {atDesk ? (
          <article aria-live="polite" className="walk-card">
            <p className="walk-eyebrow">ARTASIN custom orders</p>
            <h2>Looking for something made just for you?</h2>
            <p>
              Tell us the subject, size, style and budget you have in mind, and we will match
              you with an artist to create it.
            </p>
            <div className="walk-card-actions">
              <Link className="button button-primary" href="/requests">
                Request a custom piece
              </Link>
            </div>
          </article>
        ) : null}
        <div className="walk-nav">
          {tour ? (
            <button className="walk-chip is-active" onClick={nextSuggestion} type="button">
              Next suggestion ({tour.position + 2} of {tour.indices.length}) &rarr;
            </button>
          ) : null}
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
