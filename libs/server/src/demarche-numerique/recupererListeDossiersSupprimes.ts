import queryGraphQL from "./queryGraphQL.ts";

import { pendingDeletedDossiersQuery, deletedDossiersQuery } from "./graphQLqueries.ts";

async function recupererListeDeletedDossiers(token: string, demarcheNumber: number) {
  const delDoss = await queryGraphQL(token, deletedDossiersQuery, { demarcheNumber, last: 100 });

  return delDoss.demarche.deletedDossiers.nodes;
}

async function recupererListePendingDeletedDossiers(token: string, demarcheNumber: number) {
  const pendDelDoss = await queryGraphQL(token, pendingDeletedDossiersQuery, {
    demarcheNumber,
    last: 100,
  });

  return pendDelDoss.demarche.pendingDeletedDossiers.nodes;
}

export default function recupererTousLesDossiersSupprimes(token: string, demarcheNumber: number) {
  return Promise.all([
    recupererListeDeletedDossiers(token, demarcheNumber),
    recupererListePendingDeletedDossiers(token, demarcheNumber),
  ]).then((res) => res.flat(Infinity));
}
