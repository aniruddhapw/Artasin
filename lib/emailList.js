/** Splits "a@x.com, b@y.com" into trimmed, non-empty addresses. */
export function parseEmailList(value) {
  return String(value || "")
    .split(/[,;\s]+/)
    .map((address) => address.trim())
    .filter((address) => address.includes("@"));
}
