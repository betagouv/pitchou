import type { Knex } from "knex";
import { directDatabaseConnection } from "../database.ts";
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
