import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.js";

import type CapDossier from "../../types/database/public/CapDossier.ts";
import type Dossier from "../../types/database/public/Dossier.ts";
import type Personne from "../../types/database/public/Personne.ts";

export function trouverRelationPersonneDepuisCap(
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

export async function instructeurSuitDossier(
  personneid: Personne["id"],
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  return databaseConnection("arête_personne_suit_dossier")
    .insert({
      personne: personneid,
      dossier: dossierId,
    })
    .onConflict(["personne", "dossier"])
    .ignore() // ignorer si la personne suit déjà le dossier, parce que c'est le résultat final qui compte
    .then(() => undefined);
}

export async function instructeurLaisseDossier(
  personneid: Personne["id"],
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  return databaseConnection("arête_personne_suit_dossier")
    .delete()
    .where({
      personne: personneid,
      dossier: dossierId,
    })
    .then(() => undefined);
}
