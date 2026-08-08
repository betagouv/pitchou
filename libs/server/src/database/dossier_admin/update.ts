import type { Knex } from "knex";
import { directDatabaseConnection } from "../../database.ts";
import { updateDossier } from "../dossier.ts";
import type { default as Dossier, DossierId } from "@pitchou/types/database/public/Dossier.ts";
import { DossierManagedByDnError, DossierUnknownSourceError } from "./errors.ts";
import { ensurePersonneIdByEmail } from "./personne.ts";
import {
  assertEditableDossierColumns,
  DN_DERIVED_DOSSIER_COLUMNS,
  getDossierSyncStatus,
} from "./policy.ts";
import { updateDossierAdminRelations } from "./relations.ts";
import type { AdminDossierUpdate } from "./types.ts";

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
    if (update.relations) throw new DossierManagedByDnError(dossierId, ["relations"]);
    const fields = Object.keys(update.columns ?? {}).filter((key) =>
      DN_DERIVED_DOSSIER_COLUMNS.has(key as keyof Dossier),
    );
    if (fields.length) throw new DossierManagedByDnError(dossierId, fields);
  }
  const personne = await ensurePersonneIdByEmail(adminEmail, trx);
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
    personne,
    trx,
  );
  if (update.relations) await updateDossierAdminRelations(dossierId, update.relations, trx);
}

export async function updateDossierFromAdmin(
  dossierId: DossierId,
  update: AdminDossierUpdate,
  adminEmail: string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  await databaseConnection.transaction((trx) =>
    updateDossierFromAdminInTransaction(dossierId, update, adminEmail, trx),
  );
}
