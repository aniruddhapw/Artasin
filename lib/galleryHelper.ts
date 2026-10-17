/**
 * The 3D gallery's helper (components/gallery3d/HelperPanel.tsx) without AI:
 * it narrows the collection by the answers a visitor taps (style, budget,
 * artist) and describes a painting from what its listing already says.
 *
 * Everything here is plain data in, data out, so a future AI helper can sit
 * behind the same panel — taking a typed question and returning the same
 * kind of matches — without touching the 3D scene.
 */

/** What the helper needs to know about a painting. */
export interface HelperPainting {
  title: string;
  artistName: string;
  artistSlug: string;
  /** The display name of the painting's style, e.g. "Landscape". */
  style: string | null;
  priceCents: number;
  /** Already formatted, e.g. "₹7,500". */
  price: string;
  description: string;
  medium: string;
  dimensions: string;
  year: number | null;
  artistBio: string | null;
  artistLocation: string | null;
  artistDiscipline: string | null;
}

export interface BudgetBand {
  id: string;
  label: string;
  /** Inclusive lower bound, in paise. */
  min: number;
  /** Exclusive upper bound, in paise. */
  max: number;
}

// Listings are priced in rupees; bounds are in paise like priceCents.
export const BUDGET_BANDS: readonly BudgetBand[] = [
  { id: "under-10k", label: "Under ₹10,000", min: 0, max: 1_000_000 },
  { id: "10k-25k", label: "₹10,000 – ₹25,000", min: 1_000_000, max: 2_500_000 },
  { id: "25k-50k", label: "₹25,000 – ₹50,000", min: 2_500_000, max: 5_000_000 },
  { id: "50k-1l", label: "₹50,000 – ₹1,00,000", min: 5_000_000, max: 10_000_000 },
  { id: "over-1l", label: "Over ₹1,00,000", min: 10_000_000, max: Number.POSITIVE_INFINITY }
];

export interface Choice {
  id: string;
  label: string;
  count: number;
}

/** The styles that are actually on the walls, most paintings first. */
export function styleChoices(paintings: readonly HelperPainting[]): Choice[] {
  const counts = new Map<string, number>();
  for (const painting of paintings) {
    if (painting.style) {
      counts.set(painting.style, (counts.get(painting.style) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([style, count]) => ({ id: style, label: style, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** The budget bands with at least one painting in them, within a style if given. */
export function budgetChoices(paintings: readonly HelperPainting[], style: string | null): Choice[] {
  const pool = style ? paintings.filter((painting) => painting.style === style) : paintings;
  return BUDGET_BANDS.map((band) => ({
    id: band.id,
    label: band.label,
    count: pool.filter((painting) => inBand(painting, band)).length
  })).filter((choice) => choice.count > 0);
}

export interface HelperQuery {
  style?: string | null;
  budget?: string | null;
  artistSlug?: string | null;
  /** A painting to leave out, e.g. the one being asked about. */
  exclude?: number | null;
}

export interface HelperMatches {
  /** Indices into the paintings array, best first. */
  indices: number[];
  /** False when nothing fitted every answer and some were relaxed. */
  exact: boolean;
  /** What was relaxed to find these, for the helper to say. */
  relaxed: ("budget" | "style")[];
}

const MATCH_LIMIT = 6;

/**
 * The paintings that fit the answers. If none fit them all, the budget is
 * relaxed first (keeping the style, nearest price first), then the style,
 * so the visitor always gets something to look at.
 */
export function findPaintings(paintings: readonly HelperPainting[], query: HelperQuery): HelperMatches {
  const band = BUDGET_BANDS.find((candidate) => candidate.id === query.budget) ?? null;
  const candidates = paintings
    .map((painting, index) => ({ painting, index }))
    .filter(({ index }) => index !== query.exclude)
    .filter(({ painting }) => !query.artistSlug || painting.artistSlug === query.artistSlug);

  const byStyle = (entry: { painting: HelperPainting }) => !query.style || entry.painting.style === query.style;
  const byBudget = (entry: { painting: HelperPainting }) => !band || inBand(entry.painting, band);

  // Nearest to the middle of the chosen band first; otherwise keep wall order.
  const target = band ? (Number.isFinite(band.max) ? (band.min + band.max) / 2 : band.min) : null;
  const order = (list: { painting: HelperPainting; index: number }[]) =>
    target === null
      ? list
      : [...list].sort((a, b) => Math.abs(a.painting.priceCents - target) - Math.abs(b.painting.priceCents - target));

  const exact = candidates.filter((entry) => byStyle(entry) && byBudget(entry));
  if (exact.length) {
    return { indices: order(exact).slice(0, MATCH_LIMIT).map(({ index }) => index), exact: true, relaxed: [] };
  }
  const sameStyle = candidates.filter(byStyle);
  if (band && sameStyle.length) {
    return { indices: order(sameStyle).slice(0, MATCH_LIMIT).map(({ index }) => index), exact: false, relaxed: ["budget"] };
  }
  const sameBudget = candidates.filter(byBudget);
  if (query.style && sameBudget.length) {
    return { indices: order(sameBudget).slice(0, MATCH_LIMIT).map(({ index }) => index), exact: false, relaxed: ["style"] };
  }
  return {
    indices: order(candidates).slice(0, MATCH_LIMIT).map(({ index }) => index),
    exact: false,
    relaxed: [...(band ? (["budget"] as const) : []), ...(query.style ? (["style"] as const) : [])]
  };
}

/** Paintings like this one: same style first, then the same artist. */
export function similarTo(paintings: readonly HelperPainting[], index: number): HelperMatches {
  const painting = paintings[index];
  if (!painting) {
    return { indices: [], exact: false, relaxed: [] };
  }
  const sameStyle = painting.style ? findPaintings(paintings, { style: painting.style, exclude: index }) : null;
  if (sameStyle?.exact && sameStyle.indices.length) {
    return sameStyle;
  }
  return findPaintings(paintings, { artistSlug: painting.artistSlug, exclude: index });
}

export interface PaintingStory {
  /** One line about the work itself. */
  details: string;
  description: string;
  /** About the artist, or null if their profile says nothing yet. */
  artist: string | null;
}

/** What the helper says about a painting, from its listing and the artist's profile. */
export function aboutPainting(painting: HelperPainting): PaintingStory {
  const details = [
    painting.style ? `A ${painting.style.toLowerCase()} painting` : "A painting",
    `in ${painting.medium.trim() || "mixed media"}`,
    painting.dimensions.trim() ? `(${painting.dimensions.trim()})` : "",
    painting.year ? `from ${painting.year}` : ""
  ]
    .filter(Boolean)
    .join(" ");

  const where = [painting.artistDiscipline, painting.artistLocation ? `based in ${painting.artistLocation}` : null]
    .filter(Boolean)
    .join(", ");
  const bio = painting.artistBio?.trim();
  const artist = bio || where ? [`${painting.artistName}${where ? ` (${where})` : ""}`, bio].filter(Boolean).join(": ") : null;

  return {
    details: `${details}, offered at ${painting.price}.`,
    description: clip(painting.description.trim(), 600),
    artist: artist ? clip(artist, 500) : null
  };
}

function inBand(painting: HelperPainting, band: BudgetBand): boolean {
  return painting.priceCents >= band.min && painting.priceCents < band.max;
}

/** Shortens long text at a word boundary. */
export function clip(text: string, limit: number): string {
  if (text.length <= limit) {
    return text;
  }
  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:]+$/, "")}…`;
}
