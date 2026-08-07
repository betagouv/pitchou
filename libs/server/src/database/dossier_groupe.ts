import type { Knex } from "knex";
import { directDatabaseConnection } from "../database.ts";

export async function synchronizeDossierInGroupeInstructeur(
  dossierDS: any,
  demarcheNumber: number,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  const dossierByNumberP = databaseConnection("dossier")
    .select(["id", "demarche_numerique_number"])
    .whereIn(
      "demarche_numerique_number",
      dossierDS.map((d: { number: string }) => d.number),
    )
    .where("source", "demarche_numerique")
    .then(
      (rows) =>
        new Map(rows.map(({ id, demarche_numerique_number }) => [demarche_numerique_number, id])),
    );
  const groupeByNameP = databaseConnection("groupe_instructeurs")
    .select(["id", "name"])
    .where({ demarche_number: demarcheNumber })
    .then((rows) => new Map(rows.map(({ id, name }) => [name, id])));
  const [dossierByNumber, groupeByName] = await Promise.all([dossierByNumberP, groupeByNameP]);
  const edges = dossierDS.map(({ number, groupeInstructeur: { label } }: any) => {
    const groupe_instructeurs = groupeByName.get(label);
    if (!groupe_instructeurs)
      throw new Error(`groupe_instructeursId manquant pour groupe ${label}`);
    return { dossier: dossierByNumber.get(String(number)), groupe_instructeurs };
  });
  return databaseConnection("edge_groupe_instructeurs__dossier")
    .insert(edges)
    .onConflict("dossier")
    .merge(["groupe_instructeurs"]);
}
