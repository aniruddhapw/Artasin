/**
 * Slug generation for artwork and artist-profile URLs.
 *
 * The naive `replace(/[^a-z0-9]+/g, "-")` approach silently produces an empty
 * string for any non-Latin script, which then fails server validation with an
 * error the artist can't act on. Since this marketplace is India-first, titles
 * and names in Devanagari are expected input, not an edge case — so those are
 * transliterated rather than stripped. Scripts we don't transliterate still
 * yield a usable (if generic) slug instead of blocking the artist.
 */

const DEVANAGARI_VOWELS = {
  "अ": "a", "आ": "a", "इ": "i", "ई": "i", "उ": "u", "ऊ": "u",
  "ऋ": "ri", "ॠ": "ri", "ऌ": "li", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au",
  "ऑ": "o", "ऍ": "e"
};

// Consonants carry an inherent "a" which a following matra or virama replaces.
const DEVANAGARI_CONSONANTS = {
  "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ng",
  "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "ny",
  "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
  "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
  "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
  "य": "y", "र": "r", "ल": "l", "व": "v", "ळ": "l",
  "श": "sh", "ष": "sh", "स": "s", "ह": "h",
  "क़": "q", "ख़": "kh", "ग़": "g", "ज़": "z", "ड़": "r", "ढ़": "rh", "फ़": "f"
};

// Vowel signs — these replace the consonant's inherent "a".
const DEVANAGARI_MATRAS = {
  "ा": "a", "ि": "i", "ी": "i", "ु": "u", "ू": "u",
  "ृ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ॉ": "o", "ॅ": "e"
};

const DEVANAGARI_DIGITS = {
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
  "५": "5", "६": "6", "७": "7", "८": "8", "९": "9"
};

const VIRAMA = "्";
const ANUSVARA = "ं";
const CHANDRABINDU = "ँ";
const VISARGA = "ः";
const NUKTA = "़";

// Anusvara assimilates to the following consonant's place of articulation.
// Before a labial it's "m" ("मुंबई" → mumbai, not munbai); otherwise "n".
const LABIALS = new Set(["प", "फ", "ब", "भ", "म", "फ़"]);

function transliterateDevanagari(value) {
  let out = "";
  const chars = Array.from(value);

  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index];

    if (char === ANUSVARA) {
      out += LABIALS.has(chars[index + 1]) ? "m" : "n";
      continue;
    }

    if (DEVANAGARI_CONSONANTS[char]) {
      out += `${DEVANAGARI_CONSONANTS[char]}a`;
    } else if (DEVANAGARI_MATRAS[char]) {
      // Replace the inherent "a" the preceding consonant just contributed.
      out = out.replace(/a$/, "") + DEVANAGARI_MATRAS[char];
    } else if (char === VIRAMA) {
      out = out.replace(/a$/, "");
    } else if (DEVANAGARI_VOWELS[char]) {
      out += DEVANAGARI_VOWELS[char];
    } else if (DEVANAGARI_DIGITS[char]) {
      out += DEVANAGARI_DIGITS[char];
    } else if (char === CHANDRABINDU) {
      out += "n";
    } else if (char === VISARGA) {
      out += "h";
    } else if (char === NUKTA) {
      // Handled by the precomposed consonants above; ignore standalone.
    } else {
      out += char;
    }
  }

  return out;
}

/**
 * Turns arbitrary user text into a URL-safe slug. Returns "" when nothing
 * usable survives — callers should pair this with `ensureSlug`.
 */
export function slugify(value) {
  if (!value) {
    return "";
  }

  return transliterateDevanagari(String(value))
    // Split accented Latin into base letter + combining mark, then drop the
    // mark, so "Café" becomes "cafe" rather than "caf".
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Always returns a slug the server will accept (3+ chars, [a-z0-9-]).
 * Falls back to a prefixed random suffix for scripts we don't transliterate,
 * so an artist is never blocked — the field stays editable either way.
 */
export function ensureSlug(value, fallbackPrefix = "artwork") {
  const slug = slugify(value);
  if (slug.length >= 3) {
    return slug;
  }
  const suffix = Math.random().toString(36).slice(2, 8);
  return slug ? `${slug}-${suffix}` : `${fallbackPrefix}-${suffix}`;
}
