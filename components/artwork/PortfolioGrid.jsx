"use client";

import { useState } from "react";
import { Lightbox } from "@/components/artwork/Lightbox";
import { VideoModal } from "@/components/artwork/VideoModal";
import { LazyImage } from "@/components/LazyImage";

/**
 * Public showcase of an artist's past work. Image pieces open in the same zoom
 * viewer the marketplace listings use, because the whole point of a portfolio is
 * letting someone inspect the craft before commissioning it. Video pieces open
 * in a YouTube embed instead — zooming a video is meaningless.
 */
export function PortfolioGrid({ pieces, artistName }) {
  const [openIndex, setOpenIndex] = useState(null);
  const [openVideo, setOpenVideo] = useState(null);

  const imagePieces = pieces.filter((piece) => piece.mediaType !== "VIDEO");
  const images = imagePieces.map((piece) => ({
    src: piece.detail,
    full: piece.full,
    thumb: piece.thumb,
    alt: `${piece.title} by ${artistName}`
  }));

  return (
    <>
      <div className="portfolio-grid">
        {pieces.map((piece) => {
          const isVideo = piece.mediaType === "VIDEO";
          const imageIndex = isVideo ? -1 : imagePieces.indexOf(piece);

          return (
            <figure className="portfolio-card" key={piece.id}>
              <button
                aria-label={isVideo ? `Play ${piece.title}` : `Zoom in on ${piece.title}`}
                className="portfolio-card-image group-image"
                onClick={() => (isVideo ? setOpenVideo(piece) : setOpenIndex(imageIndex))}
                type="button"
              >
                <LazyImage alt={`${piece.title} by ${artistName}`} src={piece.thumb} />
                {isVideo ? (
                  <span className="video-play-badge video-play-badge-large" aria-hidden="true">
                    &#9658;
                  </span>
                ) : null}
              </button>
              <figcaption>
                <h3>{piece.title}</h3>
                {piece.medium || piece.year ? (
                  <p className="byline">{[piece.medium, piece.year].filter(Boolean).join(" · ")}</p>
                ) : null}
                {piece.description ? <p className="portfolio-card-note">{piece.description}</p> : null}
              </figcaption>
            </figure>
          );
        })}
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

      {openVideo ? (
        <VideoModal
          onClose={() => setOpenVideo(null)}
          title={`${openVideo.title} — ${artistName}`}
          videoId={openVideo.videoId}
        />
      ) : null}
    </>
  );
}
