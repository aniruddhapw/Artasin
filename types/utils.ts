import type { CSSProperties } from "react";

/** A list with at least one element, so `list[0]` is always defined. */
export type NonEmptyArray<T> = readonly [T, ...T[]];

export function isNonEmpty<T>(list: readonly T[]): list is NonEmptyArray<T> {
  return list.length > 0;
}

/** Inline styles that also set CSS custom properties, e.g. `{ "--fill": "40%" }`. */
export type StyleWithVariables = CSSProperties & { [variable: `--${string}`]: string | number };
