import type {
  EspèceProtégée,
  OiseauAtteint,
  FauneNonOiseauAtteinte,
  FloreAtteinte,
} from "@pitchou/types/especes.d.ts";

export function espèceLabel(espèce: EspèceProtégée) {
  return `${[...espèce.nomsVernaculaires][0]} (${[...espèce.nomsScientifiques][0]})`;
}

export function makeEspèceToLabel(espèces: EspèceProtégée[]) {
  return new Map(espèces.map((e) => [e, espèceLabel(e)]));
}

export function makeEspèceToKeywords(espèces: EspèceProtégée[]) {
  return new Map(
    espèces.map((e) => [e, [...e.nomsVernaculaires, ...e.nomsScientifiques].join(" ")]),
  );
}

export function etresVivantsAtteintsCompareEspèce(
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
 * Les fourchettes sont des chaînes de caractères toujours au format 'x-y' où x et y sont des integer
 */
export const fourchettesIndividus: string[] = [
  "0-10",
  "11-100",
  "101-1000",
  "1001-10000",
  "10001+",
];
