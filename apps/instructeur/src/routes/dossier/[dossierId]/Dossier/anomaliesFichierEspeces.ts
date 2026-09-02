import { especesImpacteesFromFichierOdsArrayBuffer } from "$lib/dossier/dossier.ts";

import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { AnomalieFichierEspeces } from "@pitchou/types/especesImpact.d.ts";

const EXPECTED_EXTENSIONS = [".ods", ".xlsx"];

export function anomaliesFichierEspeces(
  dossier: DossierFull,
): Promise<AnomalieFichierEspeces[]> | undefined {
  const fichier = dossier.especesImpactees.sourceFile;
  if (!fichier?.url) return undefined;
  const extension = `.${fichier.name?.split(".").pop()}`;
  if (!EXPECTED_EXTENSIONS.includes(extension)) {
    return Promise.resolve([
      {
        message: `le fichier « ${fichier.name} » n’est ni un ${EXPECTED_EXTENSIONS.join(" ni un ")} : il n’a pas pu être lu`,
      },
    ]);
  }
  return fetch(fichier.url)
    .then((response) => response.arrayBuffer())
    .then(especesImpacteesFromFichierOdsArrayBuffer)
    .then(({ anomalies }) => anomalies);
}
