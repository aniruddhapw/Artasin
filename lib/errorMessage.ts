/**
 * The message of whatever was thrown. `catch` gives `unknown`, and code that
 * only wants to log tends to reach for `error.message`, which is undefined for
 * a thrown string and a type error under strict mode.
 */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
