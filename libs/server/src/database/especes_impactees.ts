import pLimit from "p-limit";
import type { Knex } from "knex";

import { anomaliesTitle } from "@pitchou/common/impact_espece/anomalies.ts";
import { speciesImpactChangeField } from "@pitchou/common/especes/impactGroup.ts";

import { directDatabaseConnection } from "../database.ts";
import { logActionsDossier } from "./action_dossier.ts";
import { deleteFichiersWithoutOtherReferences } from "./fichier.ts";
import { dumpImpactEspeceFromFichier } from "./impact_espece/dumpImpactEspeceFromFichier.ts";
import { changedImpactTypes } from "./impact_espece/changes.ts";

import type { default as Dossier } from "@pitchou/types/database/public/Dossier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type ImpactEspece from "@pitchou/types/database/public/ImpactEspece.ts";
import type { ActionDossierInitializer } from "@pitchou/types/database/public/ActionDossier.ts";

// Each import reads its file back from the object storage, so they are not all started at once.
const limiteImports = pLimit(4);

/**
 * Attaches the freshly downloaded espèces impactées files to their dossier and
 * records one review revision per changed impact type. Unreadable files and missing
 * previous structured data retain a coarse file revision instead.
 */
export async function synchronizeFichiersEspecesImpacteesFromDS88444(
  especesImpacteesByDossierNumber: Map<DossierDS88444["number"], FileId | null>,
  dossierIdByDNNumber: Map<DossierDS88444["number"], Dossier["id"]>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Set<DossierId>> {
  if (!databaseConnection.isTransaction)
    return databaseConnection.transaction((trx) =>
      synchronizeFichiersEspecesImpacteesFromDS88444(
        especesImpacteesByDossierNumber,
        dossierIdByDNNumber,
        trx,
      ),
    );
  // Lock in a stable order before reading either the pointer or its impact snapshot.
  const currentRows: {
    id: DossierId;
    demarche_numerique_number: string;
    especes_impactees: FileId | null;
  }[] = await databaseConnection("dossier")
    .select(["id", "demarche_numerique_number", "especes_impactees"])
    .whereIn("demarche_numerique_number", [...especesImpacteesByDossierNumber.keys()])
    .where("source", "demarche_numerique")
    .orderBy("id")
    .forUpdate();
  const changedDossiers = new Set<DossierId>();
  await Promise.all(
    currentRows.map((current) =>
      limiteImports(async () => {
        const number = Number(current.demarche_numerique_number);
        const fileId = especesImpacteesByDossierNumber.get(number);
        if (fileId === undefined || dossierIdByDNNumber.get(number) !== current.id) return;

        const before: ImpactEspece[] = await databaseConnection("impact_espece").where({
          dossier: current.id,
        });
        await databaseConnection("dossier")
          .where({ id: current.id })
          .update({ especes_impactees: fileId });
        const anomalies = fileId
          ? await dumpImpactEspeceFromFichier(current.id, fileId, databaseConnection)
          : [];
        if (anomalies.length) console.warn(`Dossier ${number} — ${anomaliesTitle(anomalies)}`);

        // An old file may still be shared elsewhere, so its cascade is not enough to clear rows.
        const obsolete = databaseConnection("impact_espece").where({ dossier: current.id });
        if (fileId) obsolete.whereNot({ source_file: fileId });
        await obsolete.delete();

        // Materializing an existing file is not an applicant edit, even if no rows existed yet.
        if (fileId === current.especes_impactees) return;
        const after: ImpactEspece[] = await databaseConnection("impact_espece").where({
          dossier: current.id,
        });
        const hasPreviousSnapshot =
          current.especes_impactees === null
            ? before.length === 0
            : before.length > 0 &&
              before.every(({ source_file }) => source_file === current.especes_impactees);
        const coarse = !hasPreviousSnapshot || anomalies.length > 0;
        const groups = coarse ? [] : changedImpactTypes(before, after);
        const labels: { identifiant_pitchou: string; libelle_pitchou: string }[] = groups.length
          ? await databaseConnection("impact_type")
              .select("identifiant_pitchou", "libelle_pitchou")
              .whereIn(
                "identifiant_pitchou",
                groups.filter((group) => group !== null),
              )
          : [];
        const labelByType = new Map(
          labels.map((row) => [row.identifiant_pitchou, row.libelle_pitchou]),
        );
        const data = coarse
          ? [{ field: "especes", label: "Espèces impactées", notification: true }]
          : groups.map((group) => ({
              field: "especes",
              notification_field: speciesImpactChangeField(group),
              label:
                group === null ? "Type d'impact non renseigné" : (labelByType.get(group) ?? group),
              notification: true,
            }));
        const actions: ActionDossierInitializer[] = data.map((data) => ({
          dossier: current.id,
          type: "especes_renseignees",
          data,
          author_petitionnaire: true,
        }));
        await logActionsDossier(actions, databaseConnection);
        if (actions.length) changedDossiers.add(current.id);
      }),
    ),
  );

  const oldFileIds = currentRows.flatMap(({ especes_impactees }) =>
    especes_impactees ? [especes_impactees] : [],
  );
  await deleteFichiersWithoutOtherReferences(oldFileIds, databaseConnection);

  return changedDossiers;
}
