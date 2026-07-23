/** Keeps only internal, single-slash paths; falls back to "/" to avoid open redirects. */
export function sanitizeInternalPath(target: string | null): string {
  if (target && target.startsWith("/") && !target.startsWith("//")) {
    return target;
  }
  return "/";
}
