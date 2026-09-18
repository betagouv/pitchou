/** Only list destinations may be retained in dossier history state. */
export function dossierReturnPath(value: unknown, origin: string): string | undefined {
  if (typeof value !== "string" || !URL.canParse(value, origin)) return;
  const url = new URL(value, origin);
  if (url.origin === origin && ["/mes-dossiers", "/tous-les-dossiers"].includes(url.pathname)) {
    return `${url.pathname}${url.search}${url.hash}`;
  }
}
