/** Keeps only internal, single-slash paths; falls back to "/" to avoid open redirects. */
export function sanitizeInternalPath(target: string | null): string {
  if (!target?.startsWith("/") || target.startsWith("//")) return "/";
  const origin = "https://pitchou.invalid";
  const url = URL.parse(target, origin);
  if (url?.origin !== origin || url.pathname.startsWith("//")) return "/";
  return url.pathname + url.search + url.hash;
}

export function isSettingsPath(path: string): boolean {
  return /^\/parametres(?:[/?#]|$)/u.test(path);
}
