import pLimit from "p-limit";
import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { logActionsDossier } from "./action_dossier.ts";
import { deleteFichiersWithoutOtherReferences } from "./fichier.ts";
import { dumpImpactEspeceFromFichier } from "./impact_espece/dumpImpactEspeceFromFichier.ts";

import type { default as Dossier } from "@pitchou/types/database/public/Dossier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";

// Each import reads its file back from the object storage, so they are not all started at once.
const limiteImports = pLimit(4);

async function dumpImpactEspece(
  fichierEspecesImpacteesByDossierNumber: Map<DossierDS88444["number"], FileId>,
  dossierIdByDNNumber: Map<DossierDS88444["number"], Dossier["id"]>,
  databaseConnection: Knex.Transaction | Knex,
): Promise<void> {
  await Promise.all(
    [...fichierEspecesImpacteesByDossierNumber].map(([dossierNumber, fichierId]) =>
      limiteImports(async () => {
        const dossierId = dossierIdByDNNumber.get(dossierNumber);
        if (!dossierId) return;

        const anomalies = await dumpImpactEspeceFromFichier(
          dossierId,
          fichierId,
          databaseConnection,
        );

        if (anomalies.length >= 1) {
          console.warn(
            `Dossier ${dossierNumber} — fichier espèces impactées : ${anomalies.length} anomalie(s)`,
            anomalies.map(({ classification, ligne, message }) =>
              [classification, ligne && `ligne ${ligne}`, message].filter(Boolean).join(", "),
            ),
          );
        }
      }),
    ),
  );
}

/**
 * Attaches the freshly downloaded espèces impactées files to their dossier and
 * returns the dossiers where that file really changed, with an historique entry:
 * the file is synchronized after the columns, so the diff of the columns cannot
 * see it.
 */
export async function synchronizeFichiersEspecesImpacteesFromDS88444(
  especesImpacteesByDossierNumber: Map<DossierDS88444["number"], FileId>,
  dossierIdByDNNumber: Map<DossierDS88444["number"], Dossier["id"]>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Set<DossierId>> {
  // Find the files already in place (to delete them below)
  const previousFichierIdRows = await databaseConnection("dossier")
    .select(["especes_impactees"])
    .whereIn("demarche_numerique_number", [...especesImpacteesByDossierNumber.keys()])
    .where("source", "demarche_numerique")
    .andWhereNot({ especes_impactees: null });

  const currentRows: {
    id: DossierId;
    demarche_numerique_number: string;
    especes_impactees: FileId | null;
  }[] = await databaseConnection("dossier")
    .select(["id", "demarche_numerique_number", "especes_impactees"])
    .whereIn("demarche_numerique_number", [...especesImpacteesByDossierNumber.keys()])
    .where("source", "demarche_numerique");
  const changedDossiers = new Set<DossierId>();
  for (const row of currentRows) {
    const fichierId = especesImpacteesByDossierNumber.get(Number(row.demarche_numerique_number));
    if (fichierId && fichierId !== row.especes_impactees) changedDossiers.add(row.id);
  }

  // Associate the new espèces impactées files with the right dossier
  const updatePs = [...especesImpacteesByDossierNumber].map(([dossierNumber, fichierId]) => {
    return databaseConnection("dossier").update({ especes_impactees: fichierId }).where({
      demarche_numerique_number: dossierNumber,
      source: "demarche_numerique",
    });
  });

  // Delete the files that were attached to a dossier and are no longer relevant
  await Promise.all(updatePs);

  await dumpImpactEspece(especesImpacteesByDossierNumber, dossierIdByDNNumber, databaseConnection);

  const oldFichierIds = previousFichierIdRows.map(({ especes_impactees }) => especes_impactees);
  await deleteFichiersWithoutOtherReferences(oldFichierIds, databaseConnection);

  await logActionsDossier(
    [...changedDossiers].map((dossier) => ({
      dossier,
      type: "especes_renseignees",
      data: {},
      author_petitionnaire: true,
    })),
    databaseConnection,
  );

  return changedDossiers;
}
