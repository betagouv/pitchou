// this script gets the dossiers of démarche 88444

import { formatISO } from "date-fns";

import queryGraphQL from "./queryGraphQL.ts";
import { dossiersQuery } from "./graphQLqueries.ts";

function getRecentlyUpdatedDossiersPage(
  token: string,
  demarcheNumber: number,
  updatedSince: Date,
  before?: string,
): Promise<any> {
  return queryGraphQL(token, dossiersQuery, {
    demarcheNumber,

    last: 100,
    updatedSince: formatISO(updatedSince),
    before,
  });
}

export async function getRecentlyUpdatedDossiers(
  token: string,
  demarcheNumber: number,
  updatedSince: Date,
): Promise<any> {
  let dossiers: any[] = [];
  let hasPreviousPage = true;
  let startCursor = undefined;

  while (hasPreviousPage) {
    const pageQueryStart = Date.now();
    const page = await getRecentlyUpdatedDossiersPage(
      token,
      demarcheNumber,
      updatedSince,
      startCursor,
    );
    const pageQueryEnd = Date.now();

    const pageDossiers = page.demarche.dossiers.nodes;

    dossiers = pageDossiers.concat(dossiers);

    if (dossiers.length >= 100) {
      const duration = (pageQueryEnd - pageQueryStart) / 1000;
      console.log("dossiers récupérés jusque-là", dossiers.length, `(${duration.toFixed(1)}secs)`);
    }

    const pageInfo = page.demarche.dossiers.pageInfo;

    hasPreviousPage = pageInfo.hasPreviousPage;
    startCursor = pageInfo.startCursor;
  }

  return dossiers;
}
