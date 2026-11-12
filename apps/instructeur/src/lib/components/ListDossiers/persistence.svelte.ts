import { untrack } from "svelte";
import { buildDossiersSearchParams, readDossiersQuery, type DossiersQuery } from "./query.ts";
import { navigateDossiers } from "./navigation.ts";

const QUERY_PARAMS = [
  "q",
  "phase",
  "activite",
  "espece",
  "action",
  "departement",
  "departements",
  "localisation",
  "instructeur",
  "nouveaute",
  "actionInstructeur",
  "enjeu",
  "decision",
  "decisionAbsente",
  "avisManquant",
  "especesAbsente",
  "from",
  "to",
  "dateField",
  "sort",
  "order",
  "page",
  "pageSize",
];

function storageKey(email: string, pathname: string): string | undefined {
  if (!email || !["/mes-dossiers", "/tous-les-dossiers"].includes(pathname)) return;
  return `pitchou:dossiers-query:${encodeURIComponent(email)}:${pathname}`;
}

function saveDossiersQuery(email: string, pathname: string, query: DossiersQuery): void {
  const key = storageKey(email, pathname);
  if (!key) return;
  try {
    localStorage.setItem(key, buildDossiersSearchParams(query).toString());
  } catch {
    // Remembering a list is optional when browser storage is unavailable or full.
  }
}

/** Restore bare list URLs, leaving explicit URL queries in charge of the current view. */
export function rememberDossiersQuery(
  getEmail: () => string,
  route: { url: { href: string } },
  goto: (url: string | URL, options: { replace: boolean; reset: boolean }) => unknown,
): (next: DossiersQuery) => unknown {
  $effect(() => {
    const email = getEmail();
    const url = new URL(route.url.href);
    const key = storageKey(email, url.pathname);
    if (!key) return;
    if (QUERY_PARAMS.some((param) => url.searchParams.has(param))) {
      saveDossiersQuery(email, url.pathname, readDossiersQuery(url.searchParams));
      return;
    }
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return;
      const params = buildDossiersSearchParams(readDossiersQuery(new URLSearchParams(saved)));
      if (params.size === 0) return;
      const restored = new URL(url.href);
      for (const [name, value] of params) restored.searchParams.append(name, value);
      untrack(() => goto(restored, { replace: true, reset: false }));
    } catch {
      // Keep the URL usable when stored preferences cannot be read.
    }
  });

  return (next) => {
    const url = new URL(route.url.href);
    saveDossiersQuery(getEmail(), url.pathname, next);
    return navigateDossiers(goto, url.pathname, next);
  };
}
