import type { Knex } from "knex";
import { normalizeEmail } from "@pitchou/common/stringManipulation.ts";
import { directDatabaseConnection } from "../database.ts";
import type { default as Dossier, DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type Personne from "@pitchou/types/database/public/Personne.ts";
import type DecisionAdministrative from "@pitchou/types/database/public/DecisionAdministrative.ts";
import type EdgePersonneFollowsDossier from "@pitchou/types/database/public/EdgePersonneFollowsDossier.ts";
import type { AvisExpertInitializer } from "@pitchou/types/database/public/AvisExpert.ts";
import type {
  DossierForInsert,
  DossierForUpdate,
} from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";
import type { PartialBy, PickNonNullable } from "@pitchou/types/tools.d.ts";

export function getDossierIdsFromDS_Ids(
  ids: Dossier["demarche_numerique_id"][],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<
  PickNonNullable<Dossier, "id" | "demarche_numerique_id" | "demarche_numerique_number">[]
> {
  return databaseConnection("dossier")
    .select(["id", "demarche_numerique_id", "demarche_numerique_number"])
    .whereIn("demarche_numerique_id", ids)
    .where("source", "demarche_numerique");
}

type DecisionToInsert = NonNullable<DossierForInsert["decision_administrative"]>[number];
async function newDecisions(decisions: DecisionToInsert[], db: Knex.Transaction | Knex) {
  const fichiers = decisions
    .map(({ fichier }) => fichier)
    .filter(
      (fichier): fichier is NonNullable<DecisionAdministrative["fichier"]> => fichier != null,
    );
  if (!fichiers.length) return decisions;
  const existing = await db("decision_administrative")
    .select(["dossier", "fichier"])
    .whereIn("fichier", fichiers);
  const key = ({ dossier, fichier }: DecisionToInsert) => `${dossier}:${fichier}`;
  const existingKeys = new Set(existing.map(key));
  return decisions.filter((decision) => !existingKeys.has(key(decision)));
}

async function synchronizePersonnes(dossiers: DossierForInsert[], db: Knex.Transaction | Knex) {
  // @ts-expect-error Synchronization input permits omitted nullable name fields.
  const followers: Pick<Personne, "email" | "last_name" | "first_names">[] = dossiers
    .flatMap(({ followers }) => followers)
    .filter((value) => value != null)
    .map(({ email, last_name, first_names }) => ({
      email: email ? normalizeEmail(email) : null,
      last_name,
      first_names,
    }));
  if (!followers.length) return [];
  await db("personne").insert(followers).onConflict(["email"]).ignore();
  const emails = followers.map(({ email }) => email).filter((email) => email != null);
  return db("personne").select("id", "email").whereIn("email", emails);
}

export async function dumpDossiers(
  dossiersForInsert: DossierForInsert[],
  dossiersForUpdate: DossierForUpdate[],
  db: Knex.Transaction | Knex = directDatabaseConnection,
) {
  const varcharKeys: (keyof Pick<Dossier, "name" | "ddep_required">)[] = ["name", "ddep_required"];
  for (const { dossier } of [...dossiersForInsert, ...dossiersForUpdate]) {
    for (const key of varcharKeys) {
      if (typeof dossier[key] === "string" && dossier[key].length >= 255) {
        console.warn(
          "Attontion !! Dossier DS numéro",
          dossier.demarche_numerique_number,
          "key",
          key,
          ".length >= 255",
        );
        console.warn("Valeur:", dossier[key]);
        console.warn(`La valeur est coupée pour qu'elle rentre en base de données`);
        // @ts-ignore The selected properties are strings.
        dossier[key] = dossier[key].slice(0, 255);
      }
    }
  }
  const updates = dossiersForUpdate.map(({ dossier }) =>
    db("dossier")
      .where("demarche_numerique_number", dossier.demarche_numerique_number)
      .where("source", "demarche_numerique")
      .update(dossier)
      .returning(["id", "demarche_numerique_number", "demarche_numerique_id"]),
  );
  const follows: EdgePersonneFollowsDossier[] = [];
  let avis: PartialBy<AvisExpertInitializer, "dossier">[] = [];
  if (dossiersForInsert.length) {
    const inserted: { id: DossierId }[] = await db("dossier")
      .insert(dossiersForInsert.map(({ dossier }) => dossier))
      .returning(["id"]);
    const personnes = await synchronizePersonnes(dossiersForInsert, db);
    if (personnes.length) {
      inserted.forEach(({ id }, index) => {
        const source = dossiersForInsert[index];
        const emails = new Set(source.followers?.map(({ email }) => email));
        const dossierFollowers = personnes.filter(({ email }) => email && emails.has(email));
        dossierFollowers.forEach(({ id: personne }) => follows.push({ dossier: id, personne }));
        if (dossierFollowers.length) {
          source.evenement_phase_dossier.forEach((event) => {
            if (!event.caused_by_personne) event.caused_by_personne = dossierFollowers[0].id;
          });
        }
      });
    }
    avis = dossiersForInsert.flatMap(({ avis_expert }) => avis_expert ?? []);
    inserted.forEach(({ id }, index) => {
      const source = dossiersForInsert[index];
      source.evenement_phase_dossier?.forEach((event) => {
        event.dossier = id;
      });
      source.avis_expert?.forEach((item) => {
        item.dossier = id;
      });
      source.decision_administrative?.forEach((item) => {
        item.dossier = id;
      });
    });
  }
  const allDossiers = [...dossiersForUpdate, ...dossiersForInsert];
  const events = allDossiers.flatMap(
    ({ evenement_phase_dossier }) => evenement_phase_dossier ?? [],
  );
  const decisions = await newDecisions(
    allDossiers.flatMap(({ decision_administrative }) => decision_administrative ?? []),
    db,
  );
  return Promise.all([
    events.length
      ? db("evenement_phase_dossier")
          .insert(events)
          .onConflict(["dossier", "phase", "timestamp"])
          .merge()
      : Promise.resolve([]),
    avis.length ? db("avis_expert").insert(avis) : Promise.resolve([]),
    decisions.length ? db("decision_administrative").insert(decisions) : Promise.resolve([]),
    follows.length
      ? db("edge_personne_follows_dossier")
          .insert(follows)
          .onConflict(["personne", "dossier"])
          .ignore()
      : Promise.resolve([]),
    Promise.resolve([]),
    ...updates,
  ]);
}
