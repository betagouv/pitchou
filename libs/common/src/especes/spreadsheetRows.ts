import type {
  FauneNonOiseauAtteinteOds_V1,
  FloreAtteinteOds_V1,
  OiseauAtteintOds_V1,
} from "@pitchou/types/especesFichierOds.d.ts";
import type {
  AnomalieFichierEspeces,
  DescriptionImpact,
  DescriptionMenacesEspeces,
} from "@pitchou/types/especesImpact.d.ts";
import type {
  ActiviteMenancante,
  ClassificationEtreVivant,
  EspeceProtegee,
  MethodeMenancante,
  MoyenDePoursuiteMenacant,
} from "@pitchou/types/especes.d.ts";
import type { ReferentielMaps } from "./types.ts";

type EspeceMap = Map<EspeceProtegee["CD_REF"], EspeceProtegee>;

export type LineFile<T> = { row: T; ligne: number };

export type ReportAnomalie = (anomalie: AnomalieFichierEspeces) => void;

const CRITERION: { champ: keyof DescriptionImpact; applicable: keyof ActiviteMenancante }[] = [
  { champ: "méthode", applicable: "Méthode" },
  { champ: "moyenDePoursuite", applicable: "Moyen de poursuite" },
  { champ: "nombreIndividus", applicable: "Nombre d'individus" },
  { champ: "nombreNids", applicable: "Nids" },
  { champ: "nombreOeufs", applicable: "Œufs" },
  { champ: "surfaceHabitatDétruit", applicable: "Surface habitat détruit (m²)" },
];

const LABEL_CRITERIA: Record<string, string> = {
  méthode: "méthode",
  moyenDePoursuite: "moyen de poursuite",
  nombreIndividus: "nombre d’individus",
  nombreNids: "nids",
  nombreOeufs: "œufs",
  surfaceHabitatDétruit: "surface habitat détruit",
};

function isSpecified(valeur: unknown): boolean {
  return valeur !== undefined && valeur !== null && valeur !== "";
}

function validateCriteria(
  impact: DescriptionImpact,
  classification: ClassificationEtreVivant,
  ligne: number,
  report: ReportAnomalie,
): void {
  const activite = impact.activité;
  if (!activite) return;

  for (const { champ, applicable } of CRITERION) {
    if (!isSpecified(impact[champ]) || activite[applicable] === "Oui") continue;

    report({
      classification,
      ligne,
      message: `le critère « ${LABEL_CRITERIA[champ]} » ne s’applique pas au type d’impact « ${activite["Libellé Pitchou"]} » : la valeur a été ignorée`,
    });
    impact[champ] = undefined;
  }
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
function resolve<T extends ActiviteMenancante | MethodeMenancante | MoyenDePoursuiteMenacant>(
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
function getEspece(
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

export function parseOiseaux(
  lignes: LineFile<OiseauAtteintOds_V1>[],
  especes: EspeceMap,
  maps: ReferentielMaps,
  report: ReportAnomalie,
): NonNullable<DescriptionMenacesEspeces["oiseau"]> {
  const classification = "oiseau";

  return lignes.flatMap(({ row, ligne }) => {
    const {
      CD_REF,
      "nombre individus": nombreIndividus,
      nids: nombreNids,
      œufs: nombreOeufs,
      "surface habitat détruit": surfaceHabitatDetruit,
      "code activité": codeActivite,
      "code méthode": codeMethode,
      "code transport": codeMoyen,
    } = row;

    const espece = getEspece(CD_REF, especes, classification, ligne, report);
    if (!espece) return [];

    // Legacy files, before the identifiant Pitchou column existed in version 1.1.0, only carry the
    // European code. A file that names no type d'impact at all is not an error: the column is
    // optional, and such lines are displayed apart, under « Type d'impact non renseigné ».
    let activiteId = row["identifiant pitchou activité"];
    if (!activiteId && isSpecified(codeActivite)) {
      if (codeActivite === "4") {
        activiteId =
          (nombreOeufs && nombreOeufs > 0) || (nombreNids && nombreNids > 0) ? "P-4-1" : "P-4-2";
      } else if (codeActivite == "2") {
        activiteId = "P-2-1";
      } else {
        activiteId = `P-${codeActivite}`;
      }
    }
    const refActivites = maps.activites[classification];
    const refMethodes = maps.methodes[classification];
    const refMoyensDePoursuite = maps.moyens[classification];

    const activite = resolve(
      activiteId,
      refActivites,
      "le type d’impact",
      classification,
      ligne,
      report,
    );
    const methode = resolve(codeMethode, refMethodes, "la méthode", classification, ligne, report);
    const moyen = resolve(
      codeMoyen,
      refMoyensDePoursuite,
      "le moyen de poursuite",
      classification,
      ligne,
      report,
    );
    if (!activite.valid || !methode.valid || !moyen.valid) return [];

    const impact = {
      espèce: espece,
      nombreIndividus,
      nombreNids,
      nombreOeufs,
      surfaceHabitatDétruit: surfaceHabitatDetruit,
      activité: activite.value,
      méthode: methode.value,
      moyenDePoursuite: moyen.value,
    };

    validateCriteria(impact, classification, ligne, report);
    return [impact];
  });
}

export function parseFaunes(
  lignes: LineFile<FauneNonOiseauAtteinteOds_V1>[],
  especes: EspeceMap,
  maps: ReferentielMaps,
  report: ReportAnomalie,
): NonNullable<DescriptionMenacesEspeces["faune non-oiseau"]> {
  const classification = "faune non-oiseau";

  return lignes.flatMap(({ row, ligne }) => {
    const {
      CD_REF,
      "nombre individus": nombreIndividus,
      "surface habitat détruit": surfaceHabitatDetruit,
      "code activité": codeActivite,
      "code méthode": codeMethode,
      "code transport": codeMoyen,
    } = row;

    const espece = getEspece(CD_REF, especes, classification, ligne, report);
    if (!espece) return [];

    let activiteId = row["identifiant pitchou activité"];
    if (!activiteId && isSpecified(codeActivite)) {
      activiteId = codeActivite === "70" ? "P-70-2" : `P-${codeActivite}`;
    }

    const activite = resolve(
      activiteId,
      maps.activites[classification],
      "le type d’impact",
      classification,
      ligne,
      report,
    );
    const methode = resolve(
      codeMethode,
      maps.methodes[classification],
      "la méthode",
      classification,
      ligne,
      report,
    );
    const moyen = resolve(
      codeMoyen,
      maps.moyens[classification],
      "le moyen de poursuite",
      classification,
      ligne,
      report,
    );
    if (!activite.valid || !methode.valid || !moyen.valid) return [];

    const impact = {
      espèce: espece,
      nombreIndividus,
      surfaceHabitatDétruit: surfaceHabitatDetruit,
      activité: activite.value,
      méthode: methode.value,
      moyenDePoursuite: moyen.value,
    };

    validateCriteria(impact, classification, ligne, report);
    return [impact];
  });
}

export function parseFlores(
  lignes: LineFile<FloreAtteinteOds_V1>[],
  especes: EspeceMap,
  maps: ReferentielMaps,
  report: ReportAnomalie,
): NonNullable<DescriptionMenacesEspeces["flore"]> {
  const classification = "flore";

  return lignes.flatMap(({ row, ligne }) => {
    const {
      CD_REF,
      "nombre individus": nombreIndividus,
      "surface habitat détruit": surfaceHabitatDetruit,
      "code activité": codeActivite,
      "identifiant pitchou activité": activiteId,
    } = row;

    const espece = getEspece(CD_REF, especes, classification, ligne, report);
    if (!espece) return [];

    const activite = resolve(
      activiteId || (isSpecified(codeActivite) ? `P-${codeActivite}` : undefined),
      maps.activites[classification],
      "le type d’impact",
      classification,
      ligne,
      report,
    );
    if (!activite.valid) return [];

    const impact = {
      espèce: espece,
      nombreIndividus,
      surfaceHabitatDétruit: surfaceHabitatDetruit,
      activité: activite.value,
    };

    validateCriteria(impact, classification, ligne, report);
    return [impact];
  });
}
