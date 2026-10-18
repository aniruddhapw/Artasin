import type { HelperPainting } from "@/lib/galleryHelper";

/**
 * A painting in the 3D gallery, as app/gallery/walk builds it. The fields
 * from HelperPainting (title, artist, style, price, description, the
 * artist's bio...) are what the helper finds and describes paintings by.
 */
export interface GalleryPainting extends HelperPainting {
  id: string;
  slug: string;
  imageUrl: string;
}

/** Screen space the overlay bars cover, in CSS pixels. */
export interface GalleryInsets {
  top: number;
  bottom: number;
}

export interface GalleryCallbacks {
  /** The visitor clicked the Artasin helper. */
  onHelper: () => void;
  /** The painting now in focus, or null when the visitor walks away. */
  onSelect: (index: number | null) => void;
  /** How many paintings' images have finished loading. */
  onProgress: (loaded: number) => void;
  /** The visitor has looked or stepped for the first time. */
  onMove: () => void;
}

/** What the React component can do to the scene. */
export interface GalleryApi {
  /** Goes to a painting (or the desk, after the last); `instant` jumps there without the glide. */
  focus(index: number, options?: { instant?: boolean }): void;
  setInsets(next: GalleryInsets): void;
  /** Shows or hides the wandering visitors (not the desk representative). */
  setVisitorsVisible(visible: boolean): void;
  dispose(): void;
}
