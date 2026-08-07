import type { Knex } from "knex";
import { directDatabaseConnection } from "../../database.ts";
import { deleteFichiersWithoutOtherReferences, storeNewFichier } from "../fichier.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { default as File, FileId } from "@pitchou/types/database/public/File.ts";
import { DossierNotCreatedInPitchouError } from "./errors.ts";
import { getDossierSyncStatus } from "./policy.ts";

export type AdminFileUpload = { name: string; media_type: string | null; content: Buffer };

async function requireNativeDossier(
  dossierId: DossierId,
  db: Knex.Transaction | Knex,
): Promise<void> {
  if (!(await getDossierSyncStatus(dossierId, db)).createdInPitchou) {
    throw new DossierNotCreatedInPitchouError(dossierId);
  }
}

export async function addPieceJointeFromAdmin(
  dossierId: DossierId,
  file: AdminFileUpload,
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Partial<File>> {
  return db.transaction(async (trx) => {
    await requireNativeDossier(dossierId, trx);
    const stored = await storeNewFichier(file, trx);
    await trx("edge_dossier__fichier_pieces_jointes_petitionnaire").insert({
      dossier: dossierId,
      fichier: stored.id,
    });
    return stored;
  });
}

export async function deletePieceJointeFromAdmin(
  dossierId: DossierId,
  fichierId: FileId,
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<number> {
  return db.transaction(async (trx) => {
    await requireNativeDossier(dossierId, trx);
    const deleted = await trx("edge_dossier__fichier_pieces_jointes_petitionnaire")
      .where({ dossier: dossierId, fichier: fichierId })
      .delete();
    if (deleted >= 1) await deleteFichiersWithoutOtherReferences([fichierId], trx);
    return deleted;
  });
}

export async function setEspecesImpacteesFromAdmin(
  dossierId: DossierId,
  file: AdminFileUpload,
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Partial<File>> {
  let storedFileId: FileId | undefined;
  try {
    return await db.transaction(async (trx) => {
      await requireNativeDossier(dossierId, trx);
      const current = await trx("dossier")
        .select("especes_impactees")
        .where({ id: dossierId })
        .first();
      const stored = await storeNewFichier(file, trx);
      storedFileId = stored.id;
      await trx("dossier").update({ especes_impactees: stored.id }).where({ id: dossierId });
      if (current?.especes_impactees)
        await deleteFichiersWithoutOtherReferences([current.especes_impactees], trx);
      return stored;
    });
  } catch (error) {
    if (storedFileId)
      await deleteFichiersWithoutOtherReferences([storedFileId], directDatabaseConnection).catch(
        () => {},
      );
    throw error;
  }
}

export async function deleteEspecesImpacteesFromAdmin(
  dossierId: DossierId,
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<boolean> {
  return db.transaction(async (trx) => {
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
