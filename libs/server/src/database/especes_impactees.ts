import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { supprimerFichiersSansAutresReferences } from "./fichier.ts";

import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";

export async function synchroniserFichiersEspecesImpacteesDepuisDS88444(
  especesImpacteesParNumeroDossier: Map<DossierDS88444["number"], FileId>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  // Find the files already in place (to delete them below)
  const fichiersIdPrecedents = await databaseConnection("dossier")
    .select(["espèces_impactées"])
    .whereIn("number_demarches_simplifiées", [...especesImpacteesParNumeroDossier.keys()])
    .andWhereNot({ espèces_impactées: null });

  // Associate the new espèces impactées files with the right dossier
  const updatePs = [...especesImpacteesParNumeroDossier].map(([numberDossier, fichierId]) => {
    return databaseConnection("dossier")
      .update({ espèces_impactées: fichierId })
      .where({ number_demarches_simplifiées: numberDossier });
  });

  // Delete the files that were attached to a dossier and are no longer relevant
  await Promise.all(updatePs);

  const fichiersAncienIds = fichiersIdPrecedents.map(({ espèces_impactées }) => espèces_impactées);
  await supprimerFichiersSansAutresReferences(fichiersAncienIds, databaseConnection);
}
