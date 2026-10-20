/**
 * The 3D gallery's named wings: paintings of a kind hang together, and each
 * run of walls carries a sign and a label on the mini-map. A painting's wing
 * comes from its style when the artist set one, otherwise from words in its
 * title, medium and description ("Warli", "Ganesha", "waterfall"); anything
 * left over hangs in the Grand Hall, by the entrance.
 *
 * Plain data with no Three.js or React, so it can be unit-tested.
 */

export interface WingPainting {
  title: string;
  style?: string | null;
  medium?: string | null;
  description?: string | null;
}

interface WingRule {
  name: string;
  /** Styles (as stored, in English) that belong here. */
  styles: readonly string[];
  /** Whole words in the title, medium or description that place a painting here. */
  words: RegExp;
}

export const GRAND_HALL = "Grand Hall";

// Checked in order: a Warli painting of Ganesha is folk art first.
const RULES: readonly WingRule[] = [
  {
    name: "Folk & Tribal Wing",
    styles: ["Madhubani", "Warli", "Gond", "Pichwai", "Tanjore", "Pattachitra", "Kalamkari", "Miniature"],
    words: /\b(madhubani|warli|gond|pichwai|tanjore|thanjavur|pattachitra|kalamkari|miniature|folk|tribal|lippan|phad|kalighat)\b/i
  },
  {
    name: "Sacred Art Wing",
    styles: ["Religious"],
    words: /\b(ganesh|ganesha|ganapati|ganadhish\w*|shiva|shiv|krishna|rama?|hanuman|durga|lakshmi|vishnu|garud|garuda|sheshnag|datta|buddha|devi|divine|deity|temple|nidhivan|nidhiwan)\b/i
  },
  {
    name: "Landscape Wing",
    styles: ["Landscape", "Seascape", "Cityscape"],
    words: /\b(landscape|seascape|cityscape|mountains?|waterfalls?|valley|peaks?|ocean|sea|shore|waves?|river|lake|backwaters?|sahyadri|fort|sinhagad|village|forest|hills?|sunset|sunrise)\b/i
  },
  {
    name: "Portrait & Figure Wing",
    styles: ["Portrait", "Figurative"],
    words: /\b(portrait|figure|figurative|woman|man|girl|boy|dancer|dance)\b/i
  },
  {
    name: "Nature Wing",
    styles: ["Still Life", "Floral", "Wildlife"],
    words: /\b(birds?|flowers?|floral|bloom|blossom|lotus|tiger|elephant|peacock|still life|wildlife)\b/i
  },
  {
    name: "Abstract & Modern Wing",
    styles: ["Abstract", "Contemporary"],
    words: /\b(abstract|contemporary|modern)\b/i
  }
];

/** A wing needs at least this many paintings; fewer join the Grand Hall. */
export const MIN_WING_SIZE = 2;

/** The wing a painting belongs in, before small wings are folded into the Grand Hall. */
export function wingOf(painting: WingPainting): string {
  if (painting.style) {
    const byStyle = RULES.find((rule) => rule.styles.includes(painting.style ?? ""));
    if (byStyle) {
      return byStyle.name;
    }
  }
  // The title says most about a painting; the description might mention
  // anything ("framed by mountains"), so it is the last word.
  for (const text of [painting.title, painting.medium, painting.description]) {
    const byWords = text ? RULES.find((rule) => rule.words.test(text)) : undefined;
    if (byWords) {
      return byWords.name;
    }
  }
  return GRAND_HALL;
}

export interface Wing {
  name: string;
  /** Where its paintings start and end in the hanging order: [start, end). */
  start: number;
  end: number;
}

/**
 * Orders paintings so each wing's hang together: the Grand Hall first, by
 * the entrance, then the wings largest first. Within a wing they keep the
 * order they came in (newest first, from the page). Returns the paintings in
 * hanging order and the wings as ranges of it.
 */
export function arrangeWings<T extends WingPainting>(paintings: readonly T[]): { paintings: T[]; wings: Wing[] } {
  const groups = new Map<string, T[]>();
  for (const painting of paintings) {
    const name = wingOf(painting);
    groups.set(name, [...(groups.get(name) ?? []), painting]);
  }
  const hall = groups.get(GRAND_HALL) ?? [];
  groups.delete(GRAND_HALL);
  for (const [name, members] of groups) {
    if (members.length < MIN_WING_SIZE) {
      hall.push(...members);
      groups.delete(name);
    }
  }
  // Largest wings first; ties in the rules' order, so the plan is stable.
  const order = RULES.map((rule) => rule.name);
  const named = [...groups].sort(([a, left], [b, right]) => right.length - left.length || order.indexOf(a) - order.indexOf(b));
  const sections: [string, T[]][] = hall.length ? [[GRAND_HALL, hall], ...named] : named;

  const arranged: T[] = [];
  const wings: Wing[] = [];
  for (const [name, members] of sections) {
    wings.push({ name, start: arranged.length, end: arranged.length + members.length });
    arranged.push(...members);
  }
  return { paintings: arranged, wings };
}
