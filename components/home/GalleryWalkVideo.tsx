"use client";

import { useEffect, useRef, useState } from "react";

const VIDEO_SRC = "/home/gallery-walk.mp4";
const POSTER_SRC = "/home/gallery-walk-poster.jpg";

/**
 * A short, silent loop of the 3D gallery for the home page (~1.2 MB). The
 * poster shows straight away; the video itself is only fetched once the
 * section is about to scroll into view, and not at all with data saver on.
 * With reduced motion it stays on the poster, with controls to play it.
 */
export function GalleryWalkVideo({ label }: { label: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [source, setSource] = useState<string | null>(null);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return undefined;
    }
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (saveData) {
      return undefined;
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setStill(reducedMotion);
          setSource(VIDEO_SRC);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      aria-label={label}
      autoPlay={!still}
      className="home-walk-video"
      controls={still}
      loop
      muted
      playsInline
      poster={POSTER_SRC}
      preload="none"
      ref={videoRef}
      src={source ?? undefined}
    />
  );
}
