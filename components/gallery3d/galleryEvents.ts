import { pageview } from "@vercel/analytics";

/**
 * What visitors do in the 3D gallery, for Vercel Web Analytics. Custom events
 * need a paid Vercel plan, so each is sent as a view of a made-up page,
 * /gallery/walk/event/<name>, which shows up in the Pages list beside the
 * real ones. Most count once per visit, to keep within the free plan's
 * monthly allowance; the ones that lead to a sale count every time.
 */
export type GalleryEvent =
  | "explored"
  | "painting-visited"
  | "view-artwork"
  | "shared"
  | "helper-opened"
  | "helper-suggestions"
  | "map-used"
  | "map-expanded"
  | "desk-visited"
  | "commission-clicked";

const EVERY_TIME: ReadonlySet<GalleryEvent> = new Set(["view-artwork", "shared", "commission-clicked"]);
const sent = new Set<GalleryEvent>();

export function galleryEvent(name: GalleryEvent): void {
  if (!EVERY_TIME.has(name)) {
    if (sent.has(name)) {
      return;
    }
    sent.add(name);
  }
  pageview({ route: "/gallery/walk/event/[name]", path: `/gallery/walk/event/${name}` });
}
