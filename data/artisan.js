export const navItems = [
  { href: "/", label: "Collections", key: "collections" },
  { href: "/artists", label: "Artists", key: "artists" },
  { href: "/requests", label: "Requests", key: "requests" },
  { href: "/gallery", label: "Exhibitions", key: "exhibitions" },
  { href: "/blog", label: "Journal", key: "journal" }
];

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
];

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
};

/** Every style that can go with this category, or [] if it has none. */
export function stylesFor(category) {
  return (artworkStyleGroups[category] || []).flatMap(([, styles]) => styles);
}

/**
 * The style to store for a category, or an error message. Categories with
 * styles need one from their own list; any other category stores none, so
 * moving a painting to Textile can't leave "Landscape" behind on it.
 */
export function resolveStyle(category, style) {
  const allowed = stylesFor(category);
  if (!allowed.length) {
    return { style: null };
  }
  if (!style) {
    return { error: "is required" };
  }
  if (!allowed.includes(style)) {
    return { error: "Choose one from the list" };
  }
  return { style };
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
];
