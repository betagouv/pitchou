import type {
  EspeceProtegee,
  OiseauAtteint,
  FauneNonOiseauAtteinte,
  FloreAtteinte,
} from "@pitchou/types/especes.d.ts";

export function especeLabel(espece: EspeceProtegee) {
  return `${[...espece.nomsVernaculaires][0]} (${[...espece.nomsScientifiques][0]})`;
}

export function makeEspeceToLabel(especes: EspeceProtegee[]) {
  return new Map(especes.map((e) => [e, especeLabel(e)]));
}

export function makeEspeceToKeywords(especes: EspeceProtegee[]) {
  return new Map(
    especes.map((e) => [e, [...e.nomsVernaculaires, ...e.nomsScientifiques].join(" ")]),
  );
}

export function etresVivantsAtteintsCompareEspece(
  { espèce: { nomsScientifiques: noms1 } }: OiseauAtteint | FauneNonOiseauAtteinte | FloreAtteinte,
  { espèce: { nomsScientifiques: noms2 } }: OiseauAtteint | FauneNonOiseauAtteinte | FloreAtteinte,
) {
  const [nom1] = noms1;
  const [nom2] = noms2;

  if (nom1 < nom2) {
    return -1;
  }
  if (nom1 > nom2) {
    return 1;
  }
  return 0;
}

/**
 * The ranges are strings always in the format 'x-y' where x and y are integers
 */
export const fourchettesIndividus: string[] = [
  "0-10",
  "11-100",
  "101-1000",
  "1001-10000",
  "10001+",
];
