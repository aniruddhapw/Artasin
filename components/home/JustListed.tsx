"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import { LazyImage } from "@/components/LazyImage";

/**
 * The newest listings as a row that scrolls sideways: swiped on a phone, or
 * stepped a card at a time with the arrows. Scroll snapping keeps a card
 * edge at the start of the row either way.
 */
/** A card in the homepage's "Just listed" rail, as app/page builds it. */
export interface JustListedWork {
  id: string;
  slug: string;
  title: string;
  artist: string;
  category: string;
  price: string;
  image: string;
  /** The same image at several widths, for phones to take a smaller one. */
  imageSrcSet: string;
  alt: string;
}

export function JustListed({ works, viewAllHref }: { works: readonly JustListedWork[]; viewAllHref: string }) {
  const t = useT();
  const railRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const syncEdges = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    setEdges({
      start: rail.scrollLeft < 4,
      end: rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 4
    });
  }, []);

  useEffect(() => {
    syncEdges();
    window.addEventListener("resize", syncEdges);
    return () => window.removeEventListener("resize", syncEdges);
  }, [syncEdges]);

  function step(direction: 1 | -1) {
    const rail = railRef.current;
    const card = rail?.querySelector<HTMLElement>(".home-card");
    if (!rail || !card) return;
    const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
    rail.scrollBy({ left: direction * (card.offsetWidth + gap), behavior: "smooth" });
  }

  return (
    <>
      <div className="home-head">
        <div>
          <h2>{t("home.listed.title")}</h2>
          <p>{t("home.listed.body")}</p>
        </div>
        <div className="home-head-tools">
          <Link className="text-link" href={viewAllHref}>
            {t("home.listed.viewAll")}
          </Link>
          <button
            aria-label={t("home.listed.previous")}
            className="home-arrow"
            disabled={edges.start}
            onClick={() => step(-1)}
            type="button"
          >
            <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
              <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
            </svg>
          </button>
          <button
            aria-label={t("home.listed.next")}
            className="home-arrow"
            disabled={edges.end}
            onClick={() => step(1)}
            type="button"
          >
            <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
              <path d="M9 5l7 7-7 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="home-rail" onScroll={syncEdges} ref={railRef}>
        {works.map((work) => (
          <Link className="home-card" href={`/artwork/${work.slug}`} key={work.id}>
            <div className="home-card-frame">
              <LazyImage
                alt={work.alt}
                sizes="(max-width: 860px) 60vw, (max-width: 1100px) 33vw, 300px"
                src={work.image}
                srcSet={work.imageSrcSet}
              />
            </div>
            <div>
              <h3>{work.title}</h3>
              <p className="home-card-artist">{work.artist}</p>
            </div>
            <div className="home-card-meta">
              <span>{work.category}</span>
              <span>{work.price}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
