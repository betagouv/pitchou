/** Keeps only internal, single-slash paths; falls back to "/" to avoid open redirects. */
export function sanitizeInternalPath(target: string | null): string {
  if (
    target &&
    target.startsWith("/") &&
    !target.startsWith("//") &&
    !target.includes("\\") &&
    ![...target].some(
      (character) => character.codePointAt(0)! <= 32 || character.codePointAt(0)! === 127,
    )
  ) {
    return target;
  }
  return "/";
}
