import {
  EMPTY_IMPACT_ESPECE,
  type ResultatImportFichierEspeces,
} from "@pitchou/common/impact_espece/parseFichierEspecesImpactees.ts";
import { especesImpacteesFromFichierOdsArrayBuffer } from "$lib/dossier/dossier.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

const EXPECTED_EXTENSIONS = [".ods", ".xlsx"];

export function loadEspecesImpactees(
  dossier: DossierFull,
): Promise<ResultatImportFichierEspeces> | undefined {
  const fichier = dossier.especesImpactees;
  if (!fichier?.url) return undefined;
  const extension = `.${fichier.name?.split(".").pop()}`;
  if (!EXPECTED_EXTENSIONS.includes(extension)) {
    return Promise.resolve({
      impactEspece: EMPTY_IMPACT_ESPECE,
      anomalies: [
        {
          message: `le fichier « ${fichier.name} » n’est ni un ${EXPECTED_EXTENSIONS.join(" ni un ")} : il n’a pas pu être lu`,
        },
      ],
    });
  }
  return fetch(fichier.url)
    .then((response) => response.arrayBuffer())
    .then(especesImpacteesFromFichierOdsArrayBuffer);
}
