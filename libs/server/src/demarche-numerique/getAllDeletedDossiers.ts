import queryGraphQL from "./queryGraphQL.ts";

import { pendingDeletedDossiersQuery, deletedDossiersQuery } from "./graphQLqueries.ts";
import type { DeletedDossier } from "@pitchou/types/demarche-numerique/apiSchema.ts";

const queries = {
  deletedDossiers: deletedDossiersQuery,
  pendingDeletedDossiers: pendingDeletedDossiersQuery,
};

async function getDeletedDossiersList(
  token: string,
  demarcheNumber: number,
  field: keyof typeof queries,
): Promise<DeletedDossier[]> {
  const dossiers: DeletedDossier[] = [];
  const cursors = new Set<string>();
  let after: string | undefined;
  while (true) {
    const result = await queryGraphQL(token, queries[field], {
      demarcheNumber,
      deletedFirst: 100,
      deletedAfter: after,
    });
    const { nodes, pageInfo } = result.demarche[field];
    dossiers.push(...nodes);
    if (!pageInfo.hasNextPage) return dossiers;

    if (!pageInfo.endCursor || cursors.has(pageInfo.endCursor))
      throw new Error(`Invalid deletion pagination for ${field}`);
    after = pageInfo.endCursor;
    cursors.add(pageInfo.endCursor);
  }
}

export default function getAllDeletedDossiers(token: string, demarcheNumber: number) {
  return Promise.all([
    getDeletedDossiersList(token, demarcheNumber, "deletedDossiers"),
    getDeletedDossiersList(token, demarcheNumber, "pendingDeletedDossiers"),
  ]).then((results) => results.flat());
}
