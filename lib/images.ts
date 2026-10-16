import type { NonEmptyArray } from "@/types/utils";
const CLOUDINARY_MARKER = "/image/upload/";

/**
 * Cloudinary stores our uploads untransformed, so every page has been serving the
 * full-resolution original. Inserting a transformation segment after /image/upload/
 * lets us ship a small file to grids and keep the original for the zoom view.
 *
 * Anything that is not a Cloudinary image URL (local /uploads/ files in development,
 * the bundled placeholder) is returned untouched.
 */
export function imageVariant<T extends string | null | undefined>(url: T, transform: string): T {
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
  // `url` was a non-empty string to get here, so T is string.
  return `${head}${transform}/${tail}` as T;
}

/** Grid cards and thumbnails. */
export function thumbUrl<T extends string | null | undefined>(url: T): T {
  return imageVariant(url, "f_auto,q_auto,w_600,c_limit");
}

/**
 * The homepage's scrolling strip. Tiles share a height and keep each work's own
 * proportions, so the image is limited by height rather than width.
 */
export function stripUrl<T extends string | null | undefined>(url: T): T {
  return imageVariant(url, "f_auto,q_auto,h_640,c_limit");
}

/** The main image on the artwork detail page. */
export function detailUrl<T extends string | null | undefined>(url: T): T {
  return imageVariant(url, "f_auto,q_auto,w_1600,c_limit");
}

/** The zoom view — as close to the original as we can serve. */
export function fullUrl<T extends string | null | undefined>(url: T): T {
  return imageVariant(url, "f_auto,q_auto:best");
}

/**
 * Link-preview card for WhatsApp, Instagram and X. Fixed 1200x630 because the
 * platforms crop to that ratio anyway, and kept small enough that WhatsApp
 * actually fetches it — it gives up on large images and shows no thumbnail.
 */
export function ogUrl<T extends string | null | undefined>(url: T): T {
  return imageVariant(url, "f_jpg,q_auto,w_1200,h_630,c_fill,g_auto");
}

export const ARTWORK_PLACEHOLDER = "/artisan/artwork-placeholder.svg";

/**
 * Normalises an artwork's media rows into the shape the gallery expects,
 * falling back to the placeholder when an artist has not uploaded anything.
 */
export interface GalleryImage {
  src: string;
  full: string;
  thumb: string;
  alt: string;
}

export function galleryImages(
  media: readonly { url: string; alt?: string | null }[] | null | undefined,
  title: string
): NonEmptyArray<GalleryImage> {
  const rows = Array.isArray(media) ? media : [];
  const [first, ...rest] = rows.map((row, index) => ({
    src: detailUrl(row.url),
    full: fullUrl(row.url),
    thumb: thumbUrl(row.url),
    alt: row.alt || `${title} artwork ${index + 1}`
  }));
  // Always at least one image, so the gallery never has nothing to show.
  if (!first) {
    return [{ src: ARTWORK_PLACEHOLDER, full: ARTWORK_PLACEHOLDER, thumb: ARTWORK_PLACEHOLDER, alt: `${title} artwork` }];
  }
  return [first, ...rest];
}

/**
 * Painting textures in the 3D gallery (app/gallery/walk). Large enough to
 * read up close on a wall, small enough that a room of them loads quickly.
 */
export function textureUrl<T extends string | null | undefined>(url: T): T {
  return imageVariant(url, "f_auto,q_auto,w_1280,c_limit");
}
