import sanitizeHtml from "sanitize-html";

/**
 * The blog body is now real HTML from a rich text editor, not plain text a
 * template escapes automatically — so unlike everywhere else on the site,
 * this is user content that gets rendered with dangerouslySetInnerHTML. This
 * allowlist is the only thing standing between an artist's post and stored
 * XSS, so it is deliberately narrow: exactly what the editor's toolbar can
 * produce, nothing else. Anything not listed here — script, style, iframe,
 * event handler attributes, javascript: links — is stripped, not escaped.
 *
 * Applied on write (POST/PATCH) so the database only ever holds clean HTML,
 * and again on read as a cheap defense-in-depth backstop in case some future
 * code path writes to BlogPost.body without going through the API.
 */
const OPTIONS = {
  allowedTags: [
    "p", "br", "strong", "em", "s", "u",
    "h2", "h3",
    "ul", "ol", "li",
    "blockquote", "a", "img", "code", "pre"
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt"]
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https"] },
  // Every link an artist adds opens safely in a new tab regardless of what
  // target/rel the editor happened to emit.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer ugc" })
  },
  // Collapses <p></p><p></p> noise Tiptap can leave behind after deleting a
  // paragraph, so an edited-down post does not accumulate empty spacing.
  exclusiveFilter: (frame) => frame.tag === "p" && !frame.text.trim() && !frame.mediaChildren?.length
};

export function sanitizeBlogHtml(html) {
  return sanitizeHtml(html || "", OPTIONS).trim();
}

/** True once sanitization would leave nothing behind — an "empty" post. */
export function isBlankBlogHtml(html) {
  const stripped = sanitizeHtml(html || "", { allowedTags: [], allowedAttributes: {} }).trim();
  return stripped.length === 0;
}
