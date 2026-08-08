import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";

export function suiviPageSelectors(length: number, selectPage: (page: number) => void) {
  if (length < 41) return undefined;
  return [
    undefined,
    ...Array.from({ length: Math.ceil(length / 20) }, (_, i) => () => selectPage(i + 1)),
  ] as [undefined, ...(() => void)[]];
}

export function displayedSuiviPage(dossiers: DossierSummary[], page: number, paginated: boolean) {
  return paginated ? dossiers.slice(20 * (page - 1), 20 * page) : dossiers;
}
