import { directDatabaseConnection } from "../../database.js";

import type Évènement from "@pitchou/types/database/public/ÉvènementMétrique.ts";
import type Personne from "@pitchou/types/database/public/Personne.ts";

export async function getÉvènementsForPersonne(email: Personne["email"]): Promise<Évènement[]> {
  const requêteSQL = await directDatabaseConnection("personne")
    .select("id")
    .where("email", "=", email);

  if (!(requêteSQL && Array.isArray(requêteSQL) && requêteSQL.length >= 1 && requêteSQL[0].id)) {
    throw new Error(`Aucun id n'a été trouvé pour l'email ${email}.`);
  }

  const personneId = requêteSQL[0].id;

  const évènements = await directDatabaseConnection("évènement_métrique")
    .select("*")
    .where("personne", "=", personneId)
    .orderBy("date", "desc");

  return évènements;
}
