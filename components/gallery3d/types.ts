/** A painting in the 3D gallery, as app/gallery/walk builds it. */
export interface GalleryPainting {
  id: string;
  slug: string;
  title: string;
  artistName: string;
  artistSlug: string;
  year: number | null;
  medium: string;
  dimensions: string;
  /** Already formatted, e.g. "₹7,500". */
  price: string;
  imageUrl: string;
}

/** Screen space the overlay bars cover, in CSS pixels. */
export interface GalleryInsets {
  top: number;
  bottom: number;
}

export interface GalleryCallbacks {
  /** The painting now in focus, or null when the visitor walks away. */
  onSelect: (index: number | null) => void;
  /** How many paintings' images have finished loading. */
  onProgress: (loaded: number) => void;
  /** The visitor has looked or stepped for the first time. */
  onMove: () => void;
}

/** What the React component can do to the scene. */
export interface GalleryApi {
  focus(index: number): void;
  setInsets(next: GalleryInsets): void;
  dispose(): void;
}
