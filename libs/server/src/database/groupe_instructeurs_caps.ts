import type { Knex } from "knex";
import { directDatabaseConnection } from "../database.ts";
import type Personne from "@pitchou/types/database/public/Personne.ts";
import type CapAnnotationWrite from "@pitchou/types/database/public/CapAnnotationWrite.ts";
import type * as API_DS from "@pitchou/types/demarche-numerique/apiSchema.ts";

export async function createInstructeurCapsAndCompleteInstructeurIds(
  emailToId: Map<API_DS.Instructeur["email"], API_DS.Instructeur["id"]>,
  demarcheNumber: number,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  const personnesP: Promise<Partial<Personne>[]> = databaseConnection("personne")
    .select(["access_code", "email"])
    .whereIn("email", [...emailToId.keys()])
    .andWhereNot({ access_code: null });
  const deleteIdsP = databaseConnection("cap_annotation_write")
    .whereNotIn("instructeur_id", [...emailToId.values()])
    .delete();
  const deleteCapsP = personnesP.then((personnes) => {
    const codes = personnes.map(({ access_code }) => access_code) as string[];
    const caps = databaseConnection("edge_cap_dossier__groupe_instructeurs")
      .select("cap_dossier")
      .whereIn(
        "groupe_instructeurs",
        databaseConnection("groupe_instructeurs")
          .select("id")
          .where({ demarche_number: demarcheNumber }),
      );
    return databaseConnection("cap_dossier")
      .whereNotIn("personne_cap", codes)
      .whereIn("cap", caps)
      .delete();
  });
  const annotationCapsP = databaseConnection("cap_annotation_write")
    .insert([...emailToId.values()].map((instructeur_id) => ({ instructeur_id })))
    .onConflict("instructeur_id")
    .ignore();
  const dossierCapsP = personnesP.then((personnes) =>
    databaseConnection("cap_dossier")
      .insert(personnes.map(({ access_code: personne_cap }) => ({ personne_cap })))
      .onConflict("personne_cap")
      .ignore(),
  );
  const metricCapsP = personnesP.then((personnes) =>
    databaseConnection("cap_evenement_metrique")
      .insert(personnes.map(({ access_code: personne_cap }) => ({ personne_cap })))
      .onConflict("personne_cap")
      .ignore(),
  );
  const annotationByIdP = Promise.all([deleteIdsP, annotationCapsP])
    .then(() =>
      databaseConnection("cap_annotation_write")
        .select(["cap", "instructeur_id"])
        .whereIn("instructeur_id", [...emailToId.values()]),
    )
    .then(
      (rows) =>
        new Map<CapAnnotationWrite["instructeur_id"], CapAnnotationWrite["cap"]>(
          rows.map(({ instructeur_id, cap }) => [instructeur_id, cap]),
        ),
    );
  const [personnes, annotationById] = await Promise.all([
    personnesP,
    annotationByIdP,
    deleteCapsP,
    dossierCapsP,
    metricCapsP,
  ]);
  const edges = personnes.map(({ access_code, email }) => ({
    personne_cap: access_code,
    // @ts-ignore Personnes were selected from the requested email set.
    annotation_write_cap: annotationById.get(emailToId.get(email)),
  }));
  return databaseConnection("edge_personne__cap_annotation_write")
    .insert(edges)
    .onConflict("personne_cap")
    .merge();
}
