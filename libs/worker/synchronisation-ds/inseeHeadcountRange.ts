/**
 * Maps an INSEE "tranche d'effectif salarié" code (codeEffectifEntreprise) to its human-readable
 * label, matching what Démarche Numérique displays (e.g. "250 à 499 salariés").
 *
 * @see https://www.insee.fr/fr/information/2028273
 */
const INSEE_HEADCOUNT_RANGE_BY_CODE: Record<string, string> = {
  NN: "Unité non employeuse ou effectif inconnu",
  "00": "0 salarié",
  "01": "1 ou 2 salariés",
  "02": "3 à 5 salariés",
  "03": "6 à 9 salariés",
  "11": "10 à 19 salariés",
  "12": "20 à 49 salariés",
  "21": "50 à 99 salariés",
  "22": "100 à 199 salariés",
  "31": "200 à 249 salariés",
  "32": "250 à 499 salariés",
  "41": "500 à 999 salariés",
  "42": "1 000 à 1 999 salariés",
  "51": "2 000 à 4 999 salariés",
  "52": "5 000 à 9 999 salariés",
  "53": "10 000 salariés et plus",
};

export function inseeHeadcountRangeLabel(code: string | null | undefined): string | undefined {
  if (!code) {
    return undefined;
  }
  return INSEE_HEADCOUNT_RANGE_BY_CODE[code] ?? undefined;
}
