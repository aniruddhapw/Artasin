const LETTERS = "ARTASIN".split("");

/**
 * The wordmark, split so each letter can be moved on its own.
 *
 * Letters are animated with transforms only: .nav-inner is a space-between
 * flex row, so anything that changed the wordmark's width (letter-spacing, for
 * instance) would shove the nav links sideways on hover.
 *
 * Split text reads as "A-R-T-A-S-I-N" to a screen reader, so the real word is
 * exposed once, visually hidden, and the letters are hidden from the tree.
 */
export function BrandMark() {
  return (
    <span className="brand-mark">
      <span className="visually-hidden">ARTASIN</span>
      {LETTERS.map((letter, index) => (
        <span
          aria-hidden="true"
          className="brand-letter"
          key={`${letter}-${index}`}
          style={{ "--letter-index": index }}
        >
          {letter}
        </span>
      ))}
    </span>
  );
}
