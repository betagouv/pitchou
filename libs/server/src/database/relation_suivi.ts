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
      "arête_groupe_instructeurs__dossier.dossier as dossier_id",
      "personne.id as personne_id",
    ])
    .leftJoin("arête_cap_dossier__groupe_instructeurs", {
      "arête_cap_dossier__groupe_instructeurs.cap_dossier": "cap_dossier.cap",
    })
    .leftJoin("arête_groupe_instructeurs__dossier", {
      "arête_groupe_instructeurs__dossier.groupe_instructeurs":
        "arête_cap_dossier__groupe_instructeurs.groupe_instructeurs",
    })
    .leftJoin("personne", { "personne.code_accès": "cap_dossier.personne_cap" })
    .where({
      "cap_dossier.cap": cap,
      "personne.email": personneEmail,
      "arête_groupe_instructeurs__dossier.dossier": dossierId,
    });
}

export async function instructeurFollowsDossier(
  personneId: Personne["id"],
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  return databaseConnection("arête_personne_suit_dossier")
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
  return databaseConnection("arête_personne_suit_dossier")
    .delete()
    .where({
      personne: personneId,
      dossier: dossierId,
    })
    .then(() => undefined);
}
