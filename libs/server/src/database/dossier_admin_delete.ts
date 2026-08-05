import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { DossierManagedByDnError } from "./dossier_admin_errors.ts";
import { getDossierSyncStatus } from "./dossier_admin_policy.ts";
import { deleteFichiersWithoutOtherReferences } from "./fichier.ts";

import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

/** Deletes a Pitchou-native dossier and its now-orphaned files. */
export async function deleteDossierFromAdmin(
  dossierId: DossierId,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  await databaseConnection.transaction(async (trx) => {
    const { managedByDn } = await getDossierSyncStatus(dossierId, trx);
    if (managedByDn) throw new DossierManagedByDnError(dossierId);

    const fileIds = await collectDossierFileIds(dossierId, trx);
    await trx("dossier").where({ id: dossierId }).delete();
    await deleteFichiersWithoutOtherReferences(fileIds, trx);
  });
}

async function collectDossierFileIds(
  dossierId: DossierId,
  databaseConnection: Knex.Transaction | Knex,
): Promise<FileId[]> {
  const [dossier, pjEdges, decisions, avis, otherAttachments] = await Promise.all([
    databaseConnection("dossier").select("especes_impactees").where({ id: dossierId }).first(),
    databaseConnection("edge_dossier__fichier_pieces_jointes_petitionnaire")
      .select("fichier")
      .where({ dossier: dossierId }),
    databaseConnection("decision_administrative").select("fichier").where({ dossier: dossierId }),
    databaseConnection("avis_expert")
      .select(["saisine_fichier", "avis_fichier"])
      .where({ dossier: dossierId }),
    databaseConnection("other_attachment").select("fichier").where({ dossier: dossierId }),
  ]);

  const fileIds = [
    dossier?.especes_impactees,
    ...pjEdges.map((edge: { fichier: FileId }) => edge.fichier),
    ...decisions.map((decision: { fichier: FileId | null }) => decision.fichier),
    ...avis.flatMap((avis: { saisine_fichier: FileId | null; avis_fichier: FileId | null }) => [
      avis.saisine_fichier,
      avis.avis_fichier,
    ]),
    ...otherAttachments.map((attachment: { fichier: FileId | null }) => attachment.fichier),
  ];

  return [...new Set(fileIds.filter((id): id is FileId => Boolean(id)))];
}
