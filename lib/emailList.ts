/** Splits "a@x.com, b@y.com" into trimmed, non-empty addresses. */
export function parseEmailList(value: string | null | undefined): string[] {
  return String(value || "")
    .split(/[,;\s]+/)
    .map((address) => address.trim())
    .filter((address) => address.includes("@"));
}
