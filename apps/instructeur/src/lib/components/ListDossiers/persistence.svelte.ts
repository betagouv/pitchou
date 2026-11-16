import { untrack } from "svelte";
import { buildDossiersSearchParams, readDossiersQuery, type DossiersQuery } from "./query.ts";
import { navigateDossiers } from "./navigation.ts";

const unsavedQueries = new Map<string, string>();

const QUERY_PARAMS = [
  "source",
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
  const saved = buildDossiersSearchParams(query).toString();
  try {
    localStorage.setItem(key, saved);
    unsavedQueries.delete(key);
  } catch {
    // Keep this tab's latest choice when readable storage contains an older query.
    unsavedQueries.set(key, saved);
  }
}

/** Restore saved filters on list entry; URL changes within the list remain authoritative. */
export function rememberDossiersQuery(
  getEmail: () => string,
  route: { url: { href: string } },
  goto: (url: string | URL, options: { replace: boolean; reset: boolean }) => unknown,
  getReplace: () => boolean = () => true,
): (next: DossiersQuery) => unknown {
  let currentKey: string | undefined;
  $effect(() => {
    const email = getEmail();
    const url = new URL(route.url.href);
    const key = storageKey(email, url.pathname);
    const enteringList = currentKey !== key;
    currentKey = key;
    if (!key) return;
    if (!enteringList || QUERY_PARAMS.some((param) => url.searchParams.has(param))) {
      saveDossiersQuery(email, url.pathname, readDossiersQuery(url.searchParams));
      return;
    }
    try {
      const saved = unsavedQueries.get(key) ?? localStorage.getItem(key);
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
    return navigateDossiers(goto, url.pathname, next, getReplace());
  };
}
