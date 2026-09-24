/**
 * The artist walkthrough: how a listing gets made, and how past work gets
 * added. It crosses three routes, so every step names the route it belongs to
 * and the tour navigates there before looking for the anchor.
 *
 * Anchors are `data-tour` attributes rather than class selectors — a class is
 * free to be renamed for styling reasons, and the tour silently losing a step
 * is exactly the kind of breakage nobody notices. Grepping for the attribute
 * finds both ends.
 */
export const STUDIO_TOUR_STEPS = [
  { anchor: "studio-actions", route: "/studio", placement: "bottom" },
  { anchor: "studio-share", route: "/studio", placement: "bottom" },
  { anchor: "artwork-images", route: "/studio/artworks/new", placement: "top" },
  { anchor: "artwork-details", route: "/studio/artworks/new", placement: "bottom" },
  { anchor: "artwork-status", route: "/studio/artworks/new", placement: "bottom" },
  { anchor: "artwork-submit", route: "/studio/artworks/new", placement: "top" },
  { anchor: "portfolio-media", route: "/studio/portfolio", placement: "bottom" },
  { anchor: "portfolio-upload", route: "/studio/portfolio", placement: "bottom" },
  { anchor: "portfolio-list", route: "/studio/portfolio", placement: "top" }
];

export const TOUR_STORAGE_KEY = "artasin.studio-tour.v1";

export function tourSelector(anchor) {
  return `[data-tour="${anchor}"]`;
}

/**
 * Whether this browser has already been through the tour. Storage can throw in
 * a private window, and a tour shown twice is a smaller problem than a studio
 * that will not render, so a failure reads as "already seen".
 */
export function hasSeenTour() {
  try {
    return Boolean(window.localStorage.getItem(TOUR_STORAGE_KEY));
  } catch {
    return true;
  }
}

export function markTourSeen() {
  try {
    window.localStorage.setItem(TOUR_STORAGE_KEY, new Date().toISOString());
  } catch {
    // Nothing to do — the tour simply offers itself again next time.
  }
}
