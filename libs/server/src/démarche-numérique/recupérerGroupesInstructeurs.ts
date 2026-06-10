import graphQLQuery from "./queryGraphQL.ts";

import { GroupeInstructeursQuery } from "./graphQLqueries.ts";
import { normalisationEmail } from "@pitchou/common/manipulationStrings.ts";

import type { GroupeInstructeurs } from "@pitchou/types/démarche-numérique/apiSchema.ts";

export async function recupérerGroupesInstructeurs(
  token: string,
  demarcheNumber: number,
): Promise<GroupeInstructeurs[]> {
  const res = await graphQLQuery(token, GroupeInstructeursQuery, { demarcheNumber });
  const groupeInstructeurs = res.demarche.groupeInstructeurs;

  for (const group of groupeInstructeurs) {
    for (const instructeur of group.instructeurs) {
      instructeur.email = normalisationEmail(instructeur.email);
    }
  }

  return groupeInstructeurs;
}
