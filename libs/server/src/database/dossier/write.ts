import type { Knex } from "knex";
import { directDatabaseConnection } from "../../database.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type EvenementPhaseDossier from "@pitchou/types/database/public/EvenementPhaseDossier.ts";
import type Personne from "@pitchou/types/database/public/Personne.ts";

export function deleteDossierByDSNumber(
  numbers: number[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  return databaseConnection("dossier")
    .whereIn("demarche_numerique_number", numbers)
    .where("source", "demarche_numerique")
    .delete();
}

/**
 * The instruction fields whose historique label spans several columns. The form
 * only sends what changed, so labelling « ddep » or the consultation du public
 * needs the dossier's state as it was before the update, not just the update.
 */
export function getDossierInstructionState(
  id: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<
  | Pick<
      Dossier,
      | "ddep_required"
      | "er_mesures_sufficient"
      | "public_consultation_start_date"
      | "public_consultation_end_date"
    >
  | undefined
> {
  return databaseConnection("dossier")
    .select([
      "ddep_required",
      "er_mesures_sufficient",
      "public_consultation_start_date",
      "public_consultation_end_date",
    ])
    .where({ id })
    .first();
}

export async function updateDossier(
  id: Dossier["id"],
  dossierParams: Partial<Dossier & { evenementsPhase: EvenementPhaseDossier[] }>,
  causePersonne: Personne["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  const { evenementsPhase, ...columns } = dossierParams;
  const phaseAdded = evenementsPhase
    ? await databaseConnection("evenement_phase_dossier").insert(
        evenementsPhase.map((event) => ({ ...event, caused_by_personne: causePersonne })),
      )
    : undefined;
  const updated = Object.keys(columns).length
    ? await databaseConnection("dossier").where({ id }).update(columns)
    : undefined;
  return [phaseAdded, updated];
}
