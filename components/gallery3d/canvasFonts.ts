/**
 * Font stacks for text drawn on canvases (signs, labels, the mini-map). The
 * fonts come from next/font (app/fonts.ts), whose family names are generated,
 * so they are read from the same CSS variables the stylesheet uses.
 */
function stack(variable: string, generic: string): string {
  const family =
    typeof document === "undefined" ? "" : getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return family ? `${family}, ${generic}` : generic;
}

/** Playfair Display, as the headings use it. */
export function serifFont(): string {
  return stack("--font-serif", "Georgia, serif");
}

/** Inter, as the body text uses it. */
export function sansFont(): string {
  return stack("--font-sans", '"Helvetica Neue", Arial, sans-serif');
}
