import type { Knex } from "knex";
import { directDatabaseConnection } from "../../database.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import { ensurePersonneIdByEmail } from "./personne.ts";
import { assertEditableDossierColumns } from "./policy.ts";
import { updateDossierAdminRelations } from "./relations.ts";
import type { AdminDossierCreation } from "./types.ts";

export async function createDossierFromAdmin(
  creation: AdminDossierCreation,
  adminEmail: string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<{ id: DossierId }> {
  assertEditableDossierColumns(creation.columns);
  return databaseConnection.transaction(async (trx) => {
    const [{ id }] = await trx("dossier")
      .insert({
        ...creation.columns,
        name: creation.name,
        depot_date: creation.depot_date,
        demarche_numerique_id: null,
        demarche_numerique_number: null,
        demarche_number: null,
        source: "pitchou",
      })
      .returning("id");
    await updateDossierAdminRelations(id, creation.relations, trx);
    if (creation.phase !== "Accompagnement amont") {
      const personne = await ensurePersonneIdByEmail(adminEmail, trx);
      await trx("evenement_phase_dossier").insert({
        dossier: id,
        phase: creation.phase,
        timestamp: new Date(),
        caused_by_personne: personne,
      });
    }
    return { id };
  });
}
