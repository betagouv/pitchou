import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { updateDossier } from "./dossier.ts";
import { DossierManagedByDnError, DossierUnknownSourceError } from "./dossier_admin_errors.ts";
import { ensurePersonneIdByEmail } from "./dossier_admin_personne.ts";
import {
  assertEditableDossierColumns,
  DN_DERIVED_DOSSIER_COLUMNS,
  getDossierSyncStatus,
} from "./dossier_admin_policy.ts";
import { updateDossierAdminRelations } from "./dossier_admin_relations.ts";

import type { default as Dossier, DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { AdminDossierUpdate } from "./dossier_admin_types.ts";

/** Updates dossier fields, phase events, and relations on behalf of an admin. */
export async function updateDossierFromAdminInTransaction(
  dossierId: DossierId,
  update: AdminDossierUpdate,
  adminEmail: string,
  trx: Knex.Transaction,
): Promise<void> {
  assertEditableDossierColumns(update.columns);

  const { managedByDn, source } = await getDossierSyncStatus(dossierId, trx);

  if (source === "unknown") throw new DossierUnknownSourceError(dossierId);

  if (managedByDn) {
    if (update.relations) {
      throw new DossierManagedByDnError(dossierId, ["relations"]);
    }
    const dnFields = Object.keys(update.columns ?? {}).filter((key) =>
      DN_DERIVED_DOSSIER_COLUMNS.has(key as keyof Dossier),
    );
    if (dnFields.length >= 1) {
      throw new DossierManagedByDnError(dossierId, dnFields);
    }
  }

  const adminPersonneId = await ensurePersonneIdByEmail(adminEmail, trx);
  const evenementsPhase = update.evenementsPhase?.map(({ phase, timestamp }) => ({
    dossier: dossierId,
    phase,
    timestamp,
    caused_by_personne: null,
    demarche_numerique_agent_email: null,
    demarche_numerique_motivation: null,
  }));

  await updateDossier(
    dossierId,
    { ...update.columns, ...(evenementsPhase ? { evenementsPhase } : {}) },
    adminPersonneId,
    trx,
  );

  if (update.relations) {
    await updateDossierAdminRelations(dossierId, update.relations, trx);
  }
}

/** Updates dossier fields, phase events, and relations on behalf of an admin. */
export async function updateDossierFromAdmin(
  dossierId: DossierId,
  update: AdminDossierUpdate,
  adminEmail: string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  await databaseConnection.transaction(async (trx) => {
    await updateDossierFromAdminInTransaction(dossierId, update, adminEmail, trx);
  });
}
