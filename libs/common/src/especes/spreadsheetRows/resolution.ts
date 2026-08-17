import type {
  ActiviteMenancante,
  ClassificationEtreVivant,
  EspeceProtegee,
  MethodeMenancante,
  MoyenDePoursuiteMenacant,
} from "@pitchou/types/especes.d.ts";
import type { AnomalieFichierEspeces } from "@pitchou/types/especesImpact.d.ts";

export type EspeceMap = Map<EspeceProtegee["CD_REF"], EspeceProtegee>;

/** A line of a sheet, with the number the spreadsheet shows for it, so an anomaly can name it. */
export type LineFile<T> = { row: T; ligne: number };

/** Called for everything that could not be imported as it stands. */
export type ReportAnomalie = (anomalie: AnomalieFichierEspeces) => void;

export function isSpecified(valeur: unknown): boolean {
  return valeur !== undefined && valeur !== null && valeur !== "";
}

/**
 * Either a resolved value — possibly none, when the file left the column empty — or the fact that
 * the file named something the référentiel does not know.
 */
type Resolution<T> = { valid: true; value: T | undefined } | { valid: false };

/**
 * Resolves a code against the référentiel.
 *
 * A code the référentiel does not know invalidates the whole line: we would be unable to say how
 * the espèce is impacted, and a half-described impact is worse than a reported one. The caller
 * drops the line, and the anomaly reported here tells the instructrice which code to fix.
 *
 * An empty column is not an anomaly: it means the critère was simply not filled in.
 */
export function resolve<
  T extends ActiviteMenancante | MethodeMenancante | MoyenDePoursuiteMenacant,
>(
  code: string | undefined,
  index: Map<string, T>,
  libelle: string,
  classification: ClassificationEtreVivant,
  ligne: number,
  report: ReportAnomalie,
): Resolution<T> {
  if (!isSpecified(code)) return { valid: true, value: undefined };

  const value = index.get(code as string);
  if (!value) {
    report({
      classification,
      ligne,
      message: `${libelle} « ${code} » est inconnu du référentiel : la ligne a été ignorée`,
    });
    return { valid: false };
  }
  return { valid: true, value };
}

/**
 * Resolves the espèce of a line and checks it belongs on the sheet it was written on.
 *
 * The classification is not a column of the file: it is the sheet a line sits in, and everything
 * downstream trusts it — the type d'impact, the méthode and the moyen de poursuite are all looked
 * up in the maps of that classification, and it is half the key of a moyen de poursuite. An espèce
 * written on the wrong sheet would therefore be described with another classification's vocabulary,
 * so the line is dropped rather than imported under a classification the référentiel contradicts.
 *
 * Returns `undefined` in both cases: an impact without a trustworthy espèce describes nothing.
 */
export function getEspece(
  cdRef: string,
  especes: EspeceMap,
  classification: ClassificationEtreVivant,
  ligne: number,
  report: ReportAnomalie,
): EspeceProtegee | undefined {
  const espece = especes.get(cdRef);
  if (!espece) {
    report({
      classification,
      ligne,
      message: `l’espèce de CD_REF « ${cdRef} » est inconnue du référentiel : la ligne a été ignorée`,
    });
    return undefined;
  }

  if (espece.classification !== classification) {
    report({
      classification,
      ligne,
      message: `l’espèce de CD_REF « ${cdRef} » est de classification « ${espece.classification} » et ne peut pas figurer dans la feuille « ${classification} » : la ligne a été ignorée`,
    });
    return undefined;
  }

  return espece;
}
