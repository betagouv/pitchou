import { parseSpreadsheet } from "../especes/importSpreadsheet.ts";

import type { EspeceProtegee } from "@pitchou/types/especes.d.ts";
import type {
  AnomalieFichierEspeces,
  DescriptionMenacesEspeces,
} from "@pitchou/types/especesImpact.d.ts";
import type { ActivitesMethodesMoyensDePoursuiteBundle } from "@pitchou/types/pitchouState.ts";

export type ResultatImportFichierEspeces = {
  impactEspece: DescriptionMenacesEspeces;
  anomalies: AnomalieFichierEspeces[];
};

const EMPTY_VALUE: DescriptionMenacesEspeces = {
  oiseau: [],
  "faune non-oiseau": [],
  flore: [],
};

export async function parseFichierEspecesImpactees(
  fichier: ArrayBuffer,
  especeByCD_REF: Map<EspeceProtegee["CD_REF"], EspeceProtegee>,
  referentiel: ActivitesMethodesMoyensDePoursuiteBundle,
): Promise<ResultatImportFichierEspeces> {
  const anomalies: AnomalieFichierEspeces[] = [];

  const maps = {
    activites: referentiel.activités,
    methodes: referentiel.méthodes,
    moyens: referentiel.moyensDePoursuite,
  };

  try {
    const description = await parseSpreadsheet(fichier, especeByCD_REF, maps, (anomalie) =>
      anomalies.push(anomalie),
    );

    return { impactEspece: { ...EMPTY_VALUE, ...description }, anomalies };
  } catch (error) {
    // The file itself is unusable — not a spreadsheet, or without any espèce sheet. There is no
    // line to point at, so the whole file becomes a single anomaly.
    return {
      impactEspece: EMPTY_VALUE,
      anomalies: [
        ...anomalies,
        { message: error instanceof Error ? error.message : "le fichier n’a pas pu être lu" },
      ],
    };
  }
}
