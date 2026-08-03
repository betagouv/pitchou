import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { ensurePersonneIdByEmail } from "./dossier_admin_personne.ts";
import { assertEditableDossierColumns } from "./dossier_admin_policy.ts";
import { updateDossierAdminRelations } from "./dossier_admin_relations.ts";

import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { AdminDossierCreation } from "./dossier_admin_types.ts";

/** Creates a dossier directly in Pitchou, without Demarche Numerique. */
export async function createDossierFromAdmin(
  creation: AdminDossierCreation,
  adminEmail: string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<{ id: DossierId }> {
  assertEditableDossierColumns(creation.columns);

  return databaseConnection.transaction(async (trx) => {
    const adminPersonneId = await ensurePersonneIdByEmail(adminEmail, trx);

    const [{ id: dossierId }] = await trx("dossier")
      .insert({
        ...creation.columns,
        name: creation.name,
        depot_date: creation.depot_date,
        demarche_numerique_id: null,
        demarche_numerique_number: null,
        demarche_number: null,
      })
      .returning("id");

    await updateDossierAdminRelations(dossierId, creation.relations, trx);
    await trx("evenement_phase_dossier").insert({
      dossier: dossierId,
      phase: creation.phase,
      timestamp: new Date(),
      caused_by_personne: adminPersonneId,
    });

    return { id: dossierId };
  });
}
