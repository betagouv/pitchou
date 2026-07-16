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

export function compareEtresVivantsAtteintsByEspece(
  { espèce: { nomsScientifiques: names1 } }: OiseauAtteint | FauneNonOiseauAtteinte | FloreAtteinte,
  { espèce: { nomsScientifiques: names2 } }: OiseauAtteint | FauneNonOiseauAtteinte | FloreAtteinte,
) {
  const [name1] = names1;
  const [name2] = names2;

  if (name1 < name2) {
    return -1;
  }
  if (name1 > name2) {
    return 1;
  }
  return 0;
}

/**
 * The ranges are strings always in the format 'x-y' where x and y are integers
 */
export const individusRanges: string[] = [
  "0-10",
  "11-100",
  "101-1000",
  "1001-10000",
  "10001+",
];
