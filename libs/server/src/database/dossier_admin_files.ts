import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { storeNewFichier, deleteFichiersWithoutOtherReferences } from "./fichier.ts";
import { DossierManagedByDnError, getDossierSyncStatus } from "./dossier_admin.ts";

import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { default as File, FileId } from "@pitchou/types/database/public/File.ts";

export type AdminFileUpload = {
  name: string;
  media_type: string | null;
  content: Buffer;
};

/**
 * File operations are reserved for Pitchou-native dossiers: on DN-synced
 * dossiers the pieces jointes and the fichier especes impactees are owned by
 * the sync, which garbage-collects and replaces them on every run.
 */
async function requireNativeDossier(
  dossierId: DossierId,
  databaseConnection: Knex.Transaction | Knex,
): Promise<void> {
  const { managedByDn } = await getDossierSyncStatus(dossierId, databaseConnection);
  if (managedByDn) throw new DossierManagedByDnError(dossierId);
}

/** Uploads a piece jointe and links it to the dossier (petitionnaire PJ tab). */
export async function addPieceJointeFromAdmin(
  dossierId: DossierId,
  file: AdminFileUpload,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Partial<File>> {
  return databaseConnection.transaction(async (trx) => {
    await requireNativeDossier(dossierId, trx);

    const stored = await storeNewFichier(file, trx);
    await trx("edge_dossier__fichier_pieces_jointes_petitionnaire").insert({
      dossier: dossierId,
      fichier: stored.id,
    });

    return stored;
  });
}

/** Unlinks a piece jointe from the dossier and deletes the file if now orphaned. */
export async function deletePieceJointeFromAdmin(
  dossierId: DossierId,
  fichierId: FileId,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<number> {
  return databaseConnection.transaction(async (trx) => {
    await requireNativeDossier(dossierId, trx);

    const deletedEdges = await trx("edge_dossier__fichier_pieces_jointes_petitionnaire")
      .where({ dossier: dossierId, fichier: fichierId })
      .delete();

    if (deletedEdges >= 1) {
      await deleteFichiersWithoutOtherReferences([fichierId], trx);
    }

    return deletedEdges;
  });
}

/** Uploads and sets the fichier especes impactees, deleting the previous one if orphaned. */
export async function setEspecesImpacteesFromAdmin(
  dossierId: DossierId,
  file: AdminFileUpload,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Partial<File>> {
  return databaseConnection.transaction(async (trx) => {
    await requireNativeDossier(dossierId, trx);

    const current = await trx("dossier")
      .select("especes_impactees")
      .where({ id: dossierId })
      .first();

    const stored = await storeNewFichier(file, trx);
    await trx("dossier").update({ especes_impactees: stored.id }).where({ id: dossierId });

    if (current?.especes_impactees) {
      await deleteFichiersWithoutOtherReferences([current.especes_impactees], trx);
    }

    return stored;
  });
}

/** Clears the fichier especes impactees and deletes it if it is now orphaned. */
export async function deleteEspecesImpacteesFromAdmin(
  dossierId: DossierId,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<boolean> {
  return databaseConnection.transaction(async (trx) => {
    await requireNativeDossier(dossierId, trx);

    const current = await trx("dossier")
      .select("especes_impactees")
      .where({ id: dossierId })
      .first();
    if (!current?.especes_impactees) return false;

    await trx("dossier").update({ especes_impactees: null }).where({ id: dossierId });
    await deleteFichiersWithoutOtherReferences([current.especes_impactees], trx);
    return true;
  });
}
