/**
 * Circular progress indicator for waits with no measurable percentage —
 * chiefly image uploads, where an artist on a slow connection otherwise sees a
 * static label and no sign the file is moving.
 */
export function Spinner({ size = 18, label }) {
  return (
    <span className="spinner-wrap">
      <span
        aria-hidden="true"
        className="spinner"
        style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 9)) }}
      />
      {label ? <span>{label}</span> : null}
    </span>
  );
}
