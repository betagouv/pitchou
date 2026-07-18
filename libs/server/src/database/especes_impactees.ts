import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { deleteFichiersWithoutOtherReferences } from "./fichier.ts";

import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";

export async function synchronizeFichiersEspecesImpacteesFromDS88444(
  especesImpacteesByDossierNumber: Map<DossierDS88444["number"], FileId>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  // Find the files already in place (to delete them below)
  const previousFichierIdRows = await databaseConnection("dossier")
    .select(["espèces_impactées"])
    .whereIn("number_demarches_simplifiées", [...especesImpacteesByDossierNumber.keys()])
    .andWhereNot({ espèces_impactées: null });

  // Associate the new espèces impactées files with the right dossier
  const updatePs = [...especesImpacteesByDossierNumber].map(([dossierNumber, fichierId]) => {
    return databaseConnection("dossier")
      .update({ espèces_impactées: fichierId })
      .where({ number_demarches_simplifiées: dossierNumber });
  });

  // Delete the files that were attached to a dossier and are no longer relevant
  await Promise.all(updatePs);

  const oldFichierIds = previousFichierIdRows.map(({ espèces_impactées }) => espèces_impactées);
  await deleteFichiersWithoutOtherReferences(oldFichierIds, databaseConnection);
}
