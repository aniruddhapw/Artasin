"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Artwork photos are large Cloudinary files, so a grid used to sit blank while
 * they downloaded with no sign anything was happening. This defers off-screen
 * images, shows a shimmer in the space the image will occupy, and fades the
 * photo in once it has actually decoded.
 *
 * Pass priority for an image that is above the fold — it skips lazy loading and
 * asks the browser to fetch it first.
 */
export function LazyImage({ alt, className = "", priority = false, src, ...rest }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const imageRef = useRef(null);

  // An image restored from cache can finish before React attaches onLoad.
  useEffect(() => {
    if (imageRef.current?.complete) {
      setIsLoaded(true);
    }
  }, [src]);

  return (
    <img
      alt={alt}
      className={`lazy-image${isLoaded ? " is-loaded" : ""}${className ? ` ${className}` : ""}`}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      loading={priority ? "eager" : "lazy"}
      onError={() => setIsLoaded(true)}
      onLoad={() => setIsLoaded(true)}
      ref={imageRef}
      src={src}
      {...rest}
    />
  );
}
