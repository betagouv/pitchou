import queryGraphQL from "./queryGraphQL.ts";

import { pendingDeletedDossiersQuery, deletedDossiersQuery } from "./graphQLqueries.ts";

async function getDeletedDossiersList(token: string, demarcheNumber: number) {
  const delDoss = await queryGraphQL(token, deletedDossiersQuery, { demarcheNumber, last: 100 });

  return delDoss.demarche.deletedDossiers.nodes;
}

async function getPendingDeletedDossiersList(token: string, demarcheNumber: number) {
  const pendDelDoss = await queryGraphQL(token, pendingDeletedDossiersQuery, {
    demarcheNumber,
    last: 100,
  });

  return pendDelDoss.demarche.pendingDeletedDossiers.nodes;
}

export default function getAllDeletedDossiers(token: string, demarcheNumber: number) {
  return Promise.all([
    getDeletedDossiersList(token, demarcheNumber),
    getPendingDeletedDossiersList(token, demarcheNumber),
  ]).then((res) => res.flat(Infinity));
}
