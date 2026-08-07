import { MediaTypeError } from "@pitchou/common/errors.ts";
import { especesImpacteesFromFichierOdsArrayBuffer } from "$lib/dossier/dossier.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

const EXPECTED_EXTENSIONS = [".ods", ".xlsx"];

export function loadEspecesImpactees(dossier: DossierFull) {
  const fichier = dossier.especesImpactees;
  if (!fichier?.url) return undefined;
  const extension = `.${fichier.name?.split(".").pop()}`;
  if (!EXPECTED_EXTENSIONS.includes(extension)) {
    return Promise.reject(
      new MediaTypeError({ expected: EXPECTED_EXTENSIONS.join(", "), obtained: extension }),
    );
  }
  return fetch(fichier.url)
    .then((response) => response.arrayBuffer())
    .then(especesImpacteesFromFichierOdsArrayBuffer);
}
