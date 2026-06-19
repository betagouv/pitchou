import queryGraphQL from "./queryGraphQL.ts";

import { pendingDeletedDossiersQuery, deletedDossiersQuery } from "./graphQLqueries.ts";

async function recupérerListeDeletedDossiers(token: string, demarcheNumber: number) {
  const delDoss = await queryGraphQL(token, deletedDossiersQuery, { demarcheNumber, last: 100 });

  return delDoss.demarche.deletedDossiers.nodes;
}

async function recupérerListePendingDeletedDossiers(token: string, demarcheNumber: number) {
  const pendDelDoss = await queryGraphQL(token, pendingDeletedDossiersQuery, {
    demarcheNumber,
    last: 100,
  });

  return pendDelDoss.demarche.pendingDeletedDossiers.nodes;
}

export default function récupérerTousLesDossiersSupprimés(token: string, demarcheNumber: number) {
  return Promise.all([
    recupérerListeDeletedDossiers(token, demarcheNumber),
    recupérerListePendingDeletedDossiers(token, demarcheNumber),
  ]).then((res) => res.flat(Infinity));
}
