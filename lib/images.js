const CLOUDINARY_MARKER = "/image/upload/";

/**
 * Cloudinary stores our uploads untransformed, so every page has been serving the
 * full-resolution original. Inserting a transformation segment after /image/upload/
 * lets us ship a small file to grids and keep the original for the zoom view.
 *
 * Anything that is not a Cloudinary image URL (local /uploads/ files in development,
 * the bundled placeholder) is returned untouched.
 */
export function imageVariant(url, transform) {
  if (!url || !transform) {
    return url;
  }
  const index = url.indexOf(CLOUDINARY_MARKER);
  if (index === -1) {
    return url;
  }
  const head = url.slice(0, index + CLOUDINARY_MARKER.length);
  const tail = url.slice(index + CLOUDINARY_MARKER.length);
  // Our uploads always carry a version segment. If this URL already has a
  // transformation applied, leave it alone rather than stacking another one.
  if (!/^v\d+\//.test(tail)) {
    return url;
  }
  return `${head}${transform}/${tail}`;
}

/** Grid cards and thumbnails. */
export function thumbUrl(url) {
  return imageVariant(url, "f_auto,q_auto,w_600,c_limit");
}

/** The main image on the artwork detail page. */
export function detailUrl(url) {
  return imageVariant(url, "f_auto,q_auto,w_1600,c_limit");
}

/** The zoom view — as close to the original as we can serve. */
export function fullUrl(url) {
  return imageVariant(url, "f_auto,q_auto:best");
}

/**
 * Link-preview card for WhatsApp, Instagram and X. Fixed 1200x630 because the
 * platforms crop to that ratio anyway, and kept small enough that WhatsApp
 * actually fetches it — it gives up on large images and shows no thumbnail.
 */
export function ogUrl(url) {
  return imageVariant(url, "f_jpg,q_auto,w_1200,h_630,c_fill,g_auto");
}

export const ARTWORK_PLACEHOLDER = "/artisan/artwork-placeholder.svg";

/**
 * Normalises an artwork's media rows into the shape the gallery expects,
 * falling back to the placeholder when an artist has not uploaded anything.
 */
export function galleryImages(media, title) {
  const rows = Array.isArray(media) ? media : [];
  if (!rows.length) {
    return [{ src: ARTWORK_PLACEHOLDER, full: ARTWORK_PLACEHOLDER, thumb: ARTWORK_PLACEHOLDER, alt: `${title} artwork` }];
  }
  return rows.map((row, index) => ({
    src: detailUrl(row.url),
    full: fullUrl(row.url),
    thumb: thumbUrl(row.url),
    alt: row.alt || `${title} artwork ${index + 1}`
  }));
}
