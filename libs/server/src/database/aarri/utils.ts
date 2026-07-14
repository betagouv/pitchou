import { directDatabaseConnection } from "../../database.js";

import type Evenement from "@pitchou/types/database/public/EvenementMetrique.ts";
import type Personne from "@pitchou/types/database/public/Personne.ts";

export async function getEvenementsForPersonne(email: Personne["email"]): Promise<Evenement[]> {
  const requeteSQL = await directDatabaseConnection("personne")
    .select("id")
    .where("email", "=", email);

  if (!(requeteSQL && Array.isArray(requeteSQL) && requeteSQL.length >= 1 && requeteSQL[0].id)) {
    throw new Error(`Aucun id n'a été trouvé pour l'email ${email}.`);
  }

  const personneId = requeteSQL[0].id;

  const evenements = await directDatabaseConnection("évènement_métrique")
    .select("*")
    .where("personne", "=", personneId)
    .orderBy("date", "desc");

  return evenements;
}
