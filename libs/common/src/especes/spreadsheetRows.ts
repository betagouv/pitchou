import type {
  FauneNonOiseauAtteinteOds_V1,
  FloreAtteinteOds_V1,
  OiseauAtteintOds_V1,
} from "@pitchou/types/especesFichierOds.d.ts";
import type { DescriptionMenacesEspeces } from "@pitchou/types/especesImpact.d.ts";
import { validateCriteria } from "./spreadsheetRows/criteria.ts";
import { getEspece, isSpecified, resolve } from "./spreadsheetRows/resolution.ts";
import type { EspeceMap, LineFile, ReportAnomalie } from "./spreadsheetRows/resolution.ts";

import type { ReferentielMaps } from "./types.ts";

export type { LineFile, ReportAnomalie };

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
