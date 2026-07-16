import graphQLQuery from "./queryGraphQL.ts";

import { GroupeInstructeursQuery } from "./graphQLqueries.ts";
import { normalizeEmail } from "@pitchou/common/manipulationStrings.ts";

import type { GroupeInstructeurs } from "@pitchou/types/demarche-numerique/apiSchema.ts";

export async function getGroupesInstructeurs(
  token: string,
  demarcheNumber: number,
): Promise<GroupeInstructeurs[]> {
  const res = await graphQLQuery(token, GroupeInstructeursQuery, { demarcheNumber });
  const groupeInstructeurs = res.demarche.groupeInstructeurs;

  for (const group of groupeInstructeurs) {
    for (const instructeur of group.instructeurs) {
      instructeur.email = normalizeEmail(instructeur.email);
    }
  }

  return groupeInstructeurs;
}
