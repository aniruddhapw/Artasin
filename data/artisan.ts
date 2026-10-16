import type { TranslationKey } from "@/lib/i18n/dictionaries";

export const navItems = [
  { href: "/", label: "Collections", key: "collections" },
  { href: "/artists", label: "Artists", key: "artists" },
  { href: "/requests", label: "Requests", key: "requests" },
  { href: "/gallery", label: "Exhibitions", key: "exhibitions" },
  { href: "/blog", label: "Journal", key: "journal" }
] as const;
export type NavItem = (typeof navItems)[number];

/**
 * What an artist practises. Used by onboarding and the studio profile, and kept
 * in step with artworkCategories so a textile or fashion designer can list the
 * work their discipline implies.
 */
export const artistDisciplines = [
  "Painting",
  "Sculpture",
  "Digital Art",
  "Photography",
  "Textile Design",
  "Fashion Design",
  "Illustration",
  "Printmaking",
  "Ceramics",
  "Mixed Media"
] as const;
export type ArtistDiscipline = (typeof artistDisciplines)[number];

/**
 * The second dropdown on the listing form: once an artist picks Painting or
 * Sculpture they choose what kind. Groups become <optgroup>s; a null label
 * means no heading. Values are stored in English and translated on display
 * through `style.<value>`. A category not listed here has no styles.
 */
export const artworkStyleGroups = {
  Painting: [
    [
      "styleGroup.subject",
      [
        "Landscape",
        "Portrait",
        "Abstract",
        "Still Life",
        "Figurative",
        "Floral",
        "Wildlife",
        "Cityscape",
        "Seascape",
        "Religious",
        "Contemporary"
      ]
    ],
    [
      "styleGroup.traditional",
      ["Madhubani", "Warli", "Gond", "Pichwai", "Tanjore", "Pattachitra", "Kalamkari", "Miniature"]
    ],
    [null, ["Other"]]
  ],
  Sculpture: [
    [null, ["Figurative", "Abstract", "Religious", "Wildlife", "Bust", "Relief", "Installation", "Contemporary", "Other"]]
  ]
} as const satisfies Partial<Record<ArtworkCategory, readonly (readonly [TranslationKey | null, readonly string[]])[]>>;

type StyledCategory = keyof typeof artworkStyleGroups;
export type ArtworkStyle = (typeof artworkStyleGroups)[StyledCategory][number][1][number];

/** The style to store, or why the one given can't be. */
export type StyleResolution = { style: ArtworkStyle | null; error?: undefined } | { error: string; style?: undefined };

function hasStyles(category: string | null | undefined): category is StyledCategory {
  return typeof category === "string" && Object.hasOwn(artworkStyleGroups, category);
}

/** An <optgroup>: its heading (null for none) and the styles under it. */
export type StyleGroup = readonly [label: TranslationKey | null, styles: readonly ArtworkStyle[]];

/** The style groups for a category, or undefined if it has no styles. */
export function styleGroupsFor(category: string | null | undefined): readonly StyleGroup[] | undefined {
  return hasStyles(category) ? artworkStyleGroups[category] : undefined;
}

/** Every style that can go with this category, or [] if it has none. */
export function stylesFor(category: string | null | undefined): readonly ArtworkStyle[] {
  return (styleGroupsFor(category) ?? []).flatMap(([, styles]) => styles);
}

/**
 * The style to store for a category, or an error message. Categories with
 * styles need one from their own list; any other category stores none, so
 * moving a painting to Textile can't leave "Landscape" behind on it.
 */
export function resolveStyle(category: string, style: string | null | undefined): StyleResolution {
  const allowed = stylesFor(category);
  if (!allowed.length) {
    return { style: null };
  }
  if (!style) {
    return { error: "is required" };
  }
  const match = allowed.find((candidate) => candidate === style);
  if (!match) {
    return { error: "Choose one from the list" };
  }
  return { style: match };
}

export const artworkCategories = [
  "Painting",
  "Sculpture",
  "Digital Art",
  "Photography",
  "Textile",
  "Fashion",
  "Illustration",
  "Printmaking",
  "Ceramics",
  "Mixed Media"
] as const;
export type ArtworkCategory = (typeof artworkCategories)[number];

export function isArtworkCategory(value: unknown): value is ArtworkCategory {
  return typeof value === "string" && (artworkCategories as readonly string[]).includes(value);
}
