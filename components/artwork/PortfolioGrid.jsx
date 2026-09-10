"use client";

import { useState } from "react";
import { Lightbox } from "@/components/artwork/Lightbox";

/**
 * Public showcase of an artist's past work. Every piece opens in the same zoom
 * viewer the marketplace listings use, because the whole point of a portfolio is
 * letting someone inspect the craft before commissioning it.
 */
export function PortfolioGrid({ pieces, artistName }) {
  const [openIndex, setOpenIndex] = useState(null);

  const images = pieces.map((piece) => ({
    src: piece.detail,
    full: piece.full,
    thumb: piece.thumb,
    alt: `${piece.title} by ${artistName}`
  }));

  return (
    <>
      <div className="portfolio-grid">
        {pieces.map((piece, index) => (
          <figure className="portfolio-card" key={piece.id}>
            <button
              aria-label={`Zoom in on ${piece.title}`}
              className="portfolio-card-image group-image"
              onClick={() => setOpenIndex(index)}
              type="button"
            >
              <img alt={`${piece.title} by ${artistName}`} src={piece.thumb} />
            </button>
            <figcaption>
              <h3>{piece.title}</h3>
              {piece.medium || piece.year ? (
                <p className="byline">{[piece.medium, piece.year].filter(Boolean).join(" · ")}</p>
              ) : null}
              {piece.description ? <p className="portfolio-card-note">{piece.description}</p> : null}
            </figcaption>
          </figure>
        ))}
      </div>

      {openIndex !== null ? (
        <Lightbox
          images={images}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onIndexChange={setOpenIndex}
          title={`${artistName} — past work`}
        />
      ) : null}
    </>
  );
}
