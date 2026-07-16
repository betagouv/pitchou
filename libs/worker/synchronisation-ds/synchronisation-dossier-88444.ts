import {
  downloadNewFichiersFromChampId,
  downloadNewFichiersEspecesImpactees,
} from "./downloadNewFichiersByType.ts";

import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { ChampDescriptor } from "@pitchou/types/demarche-numerique/schema.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { Knex } from "knex";
import type { ChampFormulaire88444 } from "@pitchou/types/API_Pitchou.ts";

/**
 * Downloads the new "Espèces impactées" files for démarche 88444
 */
export function getFichiersEspecesImpactees88444(
  dossiersDS: DossierDS88444[],
  pitchouKeyToChampDS: Map<string, ChampDescriptor["id"]>,
  synchronizationTransactionDS: Knex.Transaction | Knex,
): Promise<Map<DossierDS88444["number"], FileId> | undefined> {
  const fichierEspecesImpacteeChampId: ChampDescriptor["id"] | undefined = pitchouKeyToChampDS.get(
    "Déposez ici le fichier téléchargé après remplissage sur https://pitchou.beta.gouv.fr/saisie-especes",
  );
  if (!fichierEspecesImpacteeChampId) {
    throw new Error("fichierEspècesImpactéeChampId is undefined");
  }

  return downloadNewFichiersEspecesImpactees(
    dossiersDS,
    fichierEspecesImpacteeChampId,
    synchronizationTransactionDS,
  );
}

/**
 * Downloads the pièces jointes attached to the dossier provided by the pétitionnaire for démarche 88444
 */
export async function getPiecesJointesPetitionnaire88444(
  dossiersDS: DossierDS88444[],
  pitchouKeyToChampDS: Map<ChampFormulaire88444, ChampDescriptor["id"]>,
  champsWithPiecesJointes: ChampFormulaire88444[],
  databaseConnection: Knex.Transaction | Knex,
): Promise<Map<DossierDS88444["number"], FileId[]>> {
  const fichiersP: Map<DossierDS88444["number"], FileId[]> = new Map();

  for (const champ of champsWithPiecesJointes) {
    const champId = pitchouKeyToChampDS.get(champ);
    if (!champId) {
      throw new Error(`champId for ${champ} is undefined`);
    }
    const fichiersFromDossierP = downloadNewFichiersFromChampId(
      dossiersDS,
      champId,
      databaseConnection,
    );

    const fichiersFromDossier = await fichiersFromDossierP;

    if (fichiersFromDossier) {
      for (const [number, fichierIds] of fichiersFromDossier) {
        const fichierIdsAlreadyThere = fichiersP.get(number) || [];
        fichiersP.set(number, [...fichierIds, ...fichierIdsAlreadyThere]);
      }
    }
  }

  return fichiersP;
}
