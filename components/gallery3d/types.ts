import type { HelperPainting } from "@/lib/galleryHelper";
import type { Point, Rect } from "@/lib/galleryLayout";
import type { Wing } from "@/lib/galleryWings";

/**
 * A painting in the 3D gallery, as app/gallery/walk builds it. The fields
 * from HelperPainting (title, artist, style, price, description, the
 * artist's bio...) are what the helper finds and describes paintings by.
 */
export interface GalleryPainting extends HelperPainting {
  id: string;
  slug: string;
  /** The texture hung on the wall (1280px). */
  imageUrl: string;
  /** A small version for the helper's cards (600px). */
  thumbUrl: string;
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

/** The floor plan as the mini-map draws it: metres, x across, z towards the entrance. */
export interface GalleryMap {
  bounds: Rect;
  islands: Rect[];
  desk: Point & { width: number; depth: number };
  /** Where visitors come in, on the near wall. */
  entrance: Point;
  /** Each painting's place on its wall, the normal pointing into the corridor, and its wing (an index into wings). */
  paintings: { x: number; z: number; nx: number; nz: number; wing: number }[];
  /** The wings, with where to write each one's name. */
  wings: (Wing & { label: Point })[];
}

/** Where everyone is now. yaw 0 looks along -z (into the building), turning anticlockwise. */
export interface GalleryLive {
  viewer: Point & { yaw: number };
  /** The wandering visitors, or none while they are hidden. */
  visitors: Point[];
  helper: Point | null;
}

/** What the React component can do to the scene. */
export interface GalleryApi {
  /** Goes to a painting (or the desk, after the last); `instant` jumps there without the glide. */
  focus(index: number, options?: { instant?: boolean }): void;
  setInsets(next: GalleryInsets): void;
  /** Walks along the corridors to a point on the floor (stopping short of walls). */
  walkTo(point: Point): void;
  /** The floor plan, for the mini-map. */
  map: GalleryMap;
  /** Where the viewer and the people are, read every frame the mini-map draws. */
  live(): GalleryLive;
  /** Shows or hides the wandering visitors (not the desk representative). */
  setVisitorsVisible(visible: boolean): void;
  dispose(): void;
}
