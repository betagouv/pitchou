import { buildDossiersSearchParams, type DossiersQuery } from "./dossiersList.ts";

export function navigateDossiers(
  goto: (url: string, options: any) => unknown,
  pathname: string,
  next: DossiersQuery,
) {
  const search = buildDossiersSearchParams(next).toString();
  return goto(search ? `?${search}` : pathname, {
    replaceState: true,
    keepFocus: true,
    noScroll: true,
  });
}
