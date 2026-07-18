import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import type CapDossier from "@pitchou/types/database/public/CapDossier.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type Personne from "@pitchou/types/database/public/Personne.ts";

export function findRelationPersonneFromCap(
  cap: CapDossier["cap"],
  personneEmail: NonNullable<Personne["email"]>,
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any[]> {
  return databaseConnection("cap_dossier")
    .select([
      "edge_groupe_instructeurs__dossier.dossier as dossier_id",
      "personne.id as personne_id",
    ])
    .leftJoin("edge_cap_dossier__groupe_instructeurs", {
      "edge_cap_dossier__groupe_instructeurs.cap_dossier": "cap_dossier.cap",
    })
    .leftJoin("edge_groupe_instructeurs__dossier", {
      "edge_groupe_instructeurs__dossier.groupe_instructeurs":
        "edge_cap_dossier__groupe_instructeurs.groupe_instructeurs",
    })
    .leftJoin("personne", { "personne.access_code": "cap_dossier.personne_cap" })
    .where({
      "cap_dossier.cap": cap,
      "personne.email": personneEmail,
      "edge_groupe_instructeurs__dossier.dossier": dossierId,
    });
}

export async function instructeurFollowsDossier(
  personneId: Personne["id"],
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  return databaseConnection("edge_personne_follows_dossier")
    .insert({
      personne: personneId,
      dossier: dossierId,
    })
    .onConflict(["personne", "dossier"])
    .ignore() // ignore if the personne already follows the dossier, because it's the final result that matters
    .then(() => undefined);
}

export async function instructeurLeavesDossier(
  personneId: Personne["id"],
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  return databaseConnection("edge_personne_follows_dossier")
    .delete()
    .where({
      personne: personneId,
      dossier: dossierId,
    })
    .then(() => undefined);
}
