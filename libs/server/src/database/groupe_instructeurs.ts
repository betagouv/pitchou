import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import type { default as Personne } from "@pitchou/types/database/public/Personne.ts";
import type { default as GroupeInstructeurs } from "@pitchou/types/database/public/GroupeInstructeurs.ts";
import type { default as CapAnnotationWrite } from "@pitchou/types/database/public/CapAnnotationWrite.ts";
import type * as API_DS from "@pitchou/types/demarche-numerique/apiSchema.ts";

async function getGroupesInstructeurs(
  demarcheNumber: number,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<
  Map<
    GroupeInstructeurs["name"],
    { id: GroupeInstructeurs["id"]; instructeurs: Set<NonNullable<Personne["email"]>> }
  >
> {
  const groupesInstructeursDB = await databaseConnection("groupe_instructeurs")
    .select([
      "groupe_instructeurs.id as id_groupe",
      "groupe_instructeurs.name as group_name",
      "email",
    ])
    .leftJoin("edge_cap_dossier__groupe_instructeurs", {
      "edge_cap_dossier__groupe_instructeurs.groupe_instructeurs": "groupe_instructeurs.id",
    })
    .leftJoin("cap_dossier", {
      "cap_dossier.cap": "edge_cap_dossier__groupe_instructeurs.cap_dossier",
    })
    .leftJoin("personne", { "personne.access_code": "cap_dossier.personne_cap" })
    .where({ demarche_number: demarcheNumber });

  const groupByName = new Map();

  for (const { id_groupe, group_name, email } of groupesInstructeursDB) {
    const groupeInstructeurs = groupByName.get(group_name) || {
      id: id_groupe,
      instructeurs: new Set(),
    };
    // the email is null if the group in the database is empty
    if (email) {
      groupeInstructeurs.instructeurs.add(email);
    }
    groupByName.set(group_name, groupeInstructeurs);
  }

  return groupByName;
}

async function createGroupesInstructeurs(
  groupesInstructeursAPI: API_DS.GroupeInstructeurs[],
  instructeurByEmail: Map<Personne["email"], Partial<Personne>>,
  demarcheNumber: number,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  //console.log('créerGroupesInstructeurs', instructeurByEmail)

  const groupNames = groupesInstructeursAPI.map((g) => ({
    name: g.label,
    demarche_number: demarcheNumber,
  }));

  // Create the groupes d'instructeurs in the DB
  const newGroupesP = databaseConnection("groupe_instructeurs")
    .insert(groupNames)
    .returning(["id", "name"]);

  //console.log('instructeurByEmail insert', [...instructeurByEmail.values()].map(({access_code}) => ({personne_cap: access_code})))

  // Create the cap_dossier for the instructeurs who don't have one
  await databaseConnection("cap_dossier")
    .insert(
      [...instructeurByEmail.values()].map(({ access_code }) => ({ personne_cap: access_code })),
    )
    .onConflict("personne_cap")
    .ignore();

  // get the instructeurices with cap dossier
  const capDossierByCodeAccesP = databaseConnection("cap_dossier")
    .select(["cap", "personne_cap"])
    //@ts-ignore
    .whereIn(
      //@ts-ignore
      "personne_cap",
      [...instructeurByEmail.values()].map(({ access_code }) => access_code),
    )
    .then((capDossiers) => {
      const ret = new Map();

      //console.log('capDossiers', capDossiers)

      for (const { cap, personne_cap } of capDossiers) {
        ret.set(personne_cap, cap);
      }

      return ret;
    });

  const codeAccesByEmail = new Map();

  for (const { access_code, email } of instructeurByEmail.values()) {
    codeAccesByEmail.set(email, access_code);
  }

  const edges = await Promise.all([newGroupesP, capDossierByCodeAccesP]).then(
    ([nouveauxGroupes, capDossierByCodeAcces]) => {
      return groupesInstructeursAPI
        .map(({ label, instructeurs }) => {
          const groupeInstructeursId = nouveauxGroupes.find((g) => g.name === label).id;

          return instructeurs.map(({ email }) => {
            const accessCode = codeAccesByEmail.get(email);
            const capDossier = capDossierByCodeAcces.get(accessCode);

            return {
              groupe_instructeurs: groupeInstructeursId,
              cap_dossier: capDossier,
            };
          });
        })
        .flat(Infinity);
    },
  );

  return databaseConnection("edge_cap_dossier__groupe_instructeurs").insert(edges);
}

async function deleteGroupesInstructeurs(
  groupeIds: GroupeInstructeurs["id"][],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  return databaseConnection("groupe_instructeurs").delete().whereIn("id", groupeIds);
}

async function createAndReturnInstructeurPersonne(
  emailsInstructeur: NonNullable<Personne["email"]>[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Pick<Personne, "id" | "email" | "access_code">[]> {
  // Create the personnes of the instructeur.rices
  await databaseConnection("personne")
    .insert(
      emailsInstructeur.map((email) => ({
        email,
        access_code: Math.random().toString(36).slice(2),
      })),
    )
    .onConflict("email")
    .ignore();

  const instructeurPersonnesWithoutCode = await databaseConnection("personne")
    .select("*")
    .whereIn("email", emailsInstructeur)
    .where("access_code", null);

  //console.log('instructeurPersonnesWithoutCode', instructeurPersonnesWithoutCode)

  if (instructeurPersonnesWithoutCode.length >= 1) {
    const instructeurPersonnesWithCodeToAdd = instructeurPersonnesWithoutCode.map(({ id }) => ({
      id,
      access_code: Math.random().toString(36).slice(2),
    }));

    // add a access_code to the instructeur.rice.s who don't have one
    await databaseConnection("personne")
      .insert(instructeurPersonnesWithCodeToAdd)
      .onConflict("id")
      .merge(["access_code"]);
  }

  return databaseConnection("personne")
    .select(["id", "email", "access_code"])
    .whereIn("email", emailsInstructeur);
}

async function addPersonnesToGroupeByEmails(
  groupe_instructeurs: GroupeInstructeurs["id"],
  emails: Set<NonNullable<Personne["email"]>>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  //console.log('addPersonnesToGroupeByEmails', groupe_instructeurs, emails)

  // Find the instructeurs for whom a cap_dossier is missing
  const instructeursWithoutDossierCap = await databaseConnection("personne")
    .select("access_code")
    .whereIn("email", [...emails])
    .leftJoin("cap_dossier", { "personne.access_code": "cap_dossier.personne_cap" })
    .whereNull("cap");

  //console.log('instructeursWithoutDossierCap', instructeursWithoutDossierCap)

  // add the missing cap_dossier
  if (instructeursWithoutDossierCap.length >= 1) {
    await databaseConnection("cap_dossier")
      .insert(
        instructeursWithoutDossierCap.map(({ access_code }) => ({ personne_cap: access_code })),
      )
      .onConflict("personne_cap")
      .ignore();
  }

  const capDossierForTheseEmails = await databaseConnection("personne")
    .select("cap")
    .whereIn("email", [...emails])
    .leftJoin("cap_dossier", { "personne.access_code": "cap_dossier.personne_cap" });

  //console.log('capDossierForTheseEmails', capDossierForTheseEmails)

  const edges = capDossierForTheseEmails.map(({ cap: cap_dossier }) => ({
    groupe_instructeurs,
    cap_dossier,
  }));

  return databaseConnection("edge_cap_dossier__groupe_instructeurs").insert(edges);
}

async function deletePersonnesFromGroupeByEmail(
  groupe_instructeurs: GroupeInstructeurs["id"],
  emails: Set<NonNullable<Personne["email"]>>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  //console.log('deletePersonnesFromGroupeByEmail', groupe_instructeurs, emails)

  const capDossierForTheseEmails = await databaseConnection("personne")
    .select("cap")
    .whereIn("email", [...emails])
    .leftJoin("cap_dossier", { "personne.access_code": "cap_dossier.personne_cap" });

  return databaseConnection("edge_cap_dossier__groupe_instructeurs")
    .whereIn(
      ["groupe_instructeurs", "cap_dossier"],
      capDossierForTheseEmails.map(({ cap: cap_dossier }) => [groupe_instructeurs, cap_dossier]),
    )
    .delete();
}

/**
 * Enforces the invariant "you can't follow a dossier you don't have access to":
 * for the given démarche, deletes every follow (edge_personne_follows_dossier) whose
 * personne no longer has an access path to the dossier through
 * cap_dossier → groupe_instructeurs → dossier.
 */
export async function deleteNowInaccessibleSuivis(
  demarcheNumber: number,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  await databaseConnection("edge_personne_follows_dossier")
    .whereIn(
      "dossier",
      databaseConnection("dossier").select("id").where({ demarche_number: demarcheNumber }),
    )
    // keep only follows for which the personne has NO remaining access path to the dossier
    .whereNotExists(function () {
      this.select("personne.id")
        .from("personne")
        .join("cap_dossier", "cap_dossier.personne_cap", "personne.access_code")
        .join(
          "edge_cap_dossier__groupe_instructeurs",
          "edge_cap_dossier__groupe_instructeurs.cap_dossier",
          "cap_dossier.cap",
        )
        .join(
          "edge_groupe_instructeurs__dossier",
          "edge_groupe_instructeurs__dossier.groupe_instructeurs",
          "edge_cap_dossier__groupe_instructeurs.groupe_instructeurs",
        )
        .where("personne.id", databaseConnection.ref("edge_personne_follows_dossier.personne"))
        .where(
          "edge_groupe_instructeurs__dossier.dossier",
          databaseConnection.ref("edge_personne_follows_dossier.dossier"),
        );
    })
    .delete();
}

async function createInstructeurCapsAndCompleteInstructeurIds(
  instructeurEmailToId: Map<API_DS.Instructeur["email"], API_DS.Instructeur["id"]>,
  demarcheNumber: number,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  //console.log('instructeurEmailToId', instructeurEmailToId)

  // find the Personne with one of the instructeur emails who already have a code d'accès
  // @ts-ignore
  const personnesWithCodeP: Promise<Partial<Personne>[]> = databaseConnection("personne")
    .select(["access_code", "email"])
    .whereIn("email", [...instructeurEmailToId.keys()])
    .andWhereNot({ access_code: null });

  // Delete the cap_annotation_write for the instructeur_id that no longer exist
  const deleteAbsentInstructeurIdsP = databaseConnection("cap_annotation_write")
    .whereNotIn("instructeur_id", [...instructeurEmailToId.values()])
    .delete();

  // Delete the cap_dossier for the instructeurs who no longer exist in this démarche
  const deleteAbsentInstructeurCapDossier = personnesWithCodeP.then((personnesWithCode) => {
    // @ts-ignore
    const codes: string[] = personnesWithCode.map(({ access_code }) => access_code);

    const capsOfThisDemarche = databaseConnection("edge_cap_dossier__groupe_instructeurs")
      .select("cap_dossier")
      .whereIn(
        "groupe_instructeurs",
        databaseConnection("groupe_instructeurs")
          .select("id")
          .where({ demarche_number: demarcheNumber }),
      );

    return databaseConnection("cap_dossier")
      .whereNotIn("personne_cap", codes)
      .whereIn("cap", capsOfThisDemarche)
      .delete();
  });

  // Add the cap_annotation_write for the new instructeurId if there are any
  const instructeurIdAndEcritureCapsP = databaseConnection("cap_annotation_write")
    .insert([...instructeurEmailToId.values()].map((instructeur_id) => ({ instructeur_id })))
    .onConflict("instructeur_id")
    .ignore();

  // Add the cap_dossier for the new instructeurId if there are any
  const instructeurDossierCapsP = personnesWithCodeP.then((personnesWithCode) => {
    // @ts-ignore
    const codes: string[] = personnesWithCode.map(({ access_code }) => access_code);

    return databaseConnection("cap_dossier")
      .insert(codes.map((code) => ({ personne_cap: code })))
      .onConflict("personne_cap")
      .ignore();
  });

  // Add the cap_dossier for the new instructeurId if there are any
  const instructeurEvenementMetriqueCapsP = personnesWithCodeP.then((personnesWithCode) => {
    // @ts-ignore
    const codes: string[] = personnesWithCode.map(({ access_code }) => access_code);

    return databaseConnection("cap_evenement_metrique")
      .insert(codes.map((code) => ({ personne_cap: code })))
      .onConflict("personne_cap")
      .ignore();
  });

  const instructeurIdToEcritureAnnotationCapP = Promise.all([
    deleteAbsentInstructeurIdsP,
    instructeurIdAndEcritureCapsP,
  ])
    .then(() =>
      databaseConnection("cap_annotation_write")
        .select(["cap", "instructeur_id"])
        .whereIn("instructeur_id", [...instructeurEmailToId.values()]),
    )
    .then((instructeurIdAndCaps) => {
      const map: Map<CapAnnotationWrite["instructeur_id"], CapAnnotationWrite["cap"]> = new Map();

      for (const { cap, instructeur_id } of instructeurIdAndCaps) {
        map.set(instructeur_id, cap);
      }

      return map;
    });

  return Promise.all([
    personnesWithCodeP,
    instructeurIdToEcritureAnnotationCapP,
    deleteAbsentInstructeurCapDossier,
    instructeurDossierCapsP,
    instructeurEvenementMetriqueCapsP,
  ]).then(([personnesWithCode, instructeurIdToCaps]) => {
    //console.log('personnesWithCode', personnesWithCode)
    //console.log('instructeurIdToCaps', instructeurIdToCaps)

    const personneCodeToCapAnnotationWrite = [];

    for (const { access_code, email } of personnesWithCode) {
      // @ts-ignore
      const instructeurId = instructeurEmailToId.get(email);
      // @ts-ignore
      const matchingCapAnnotationWrite = instructeurIdToCaps.get(instructeurId);

      personneCodeToCapAnnotationWrite.push({
        personne_cap: access_code,
        annotation_write_cap: matchingCapAnnotationWrite,
      });
    }

    return databaseConnection("edge_personne__cap_annotation_write")
      .insert(personneCodeToCapAnnotationWrite)
      .onConflict("personne_cap")
      .merge();
  });
}

/**
 * Synchronize the groupes instructeurs in the database with those coming from the API
 */
export async function synchronizeGroupesInstructeurs(
  groupesInstructeursAPI: API_DS.GroupeInstructeurs[],
  demarcheNumber: number,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  const instructeursInDB = await createAndReturnInstructeurPersonne([
    ...new Set(
      groupesInstructeursAPI
        .map(({ instructeurs }) => instructeurs.map(({ email }) => email))
        .flat(Infinity) as string[],
    ),
  ]);

  const instructeurByEmail = new Map(instructeursInDB.map((i) => [i.email, i]));

  //console.log('instructeurByEmail', instructeurByEmail)

  const groupesInstructeursDB = await getGroupesInstructeurs(demarcheNumber, databaseConnection);

  //console.log('groupesInstructeursAPI', groupesInstructeursAPI)
  //console.log('synchronizeGroupesInstructeurs', groupesInstructeursDB)

  // Create in the DB the groups that are not there yet
  const groupesInstructeursInDSAbsentFromDB = groupesInstructeursAPI.filter(
    ({ label }) => !groupesInstructeursDB.has(label),
  );

  //console.log('groupesInstructeursInDSAbsentFromDB', groupesInstructeursInDSAbsentFromDB)

  const groupesInstructeursMissingFromDBCreated =
    groupesInstructeursInDSAbsentFromDB.length >= 1
      ? createGroupesInstructeurs(
          groupesInstructeursInDSAbsentFromDB,
          instructeurByEmail,
          demarcheNumber,
          databaseConnection,
        )
      : Promise.resolve();

  // Delete in the DB the groups that are absent from DS
  const groupesInstructeursInDBAbsentFromDS = new Map(
    [...groupesInstructeursDB].filter(
      ([nom_groupe]) => !groupesInstructeursAPI.find(({ label }) => label === nom_groupe),
    ),
  );

  //console.log('groupesInstructeurs En BDD Absents Dans DS (donc à supprimer)', groupesInstructeursInDBAbsentFromDS)

  const extraGroupesInstructeursInDBDeleted =
    groupesInstructeursInDBAbsentFromDS.size >= 1
      ? deleteGroupesInstructeurs(
          [...groupesInstructeursInDBAbsentFromDS.values()].map(({ id }) => id),
          databaseConnection,
        )
      : Promise.resolve();

  // For the groups that are present in both, find the groups that need
  // an update of the list of personnes
  const updateEmailsInGroupe = Promise.all(
    groupesInstructeursAPI.map(({ label, instructeurs: groupeAPIEmails }) => {
      const groupeDB = groupesInstructeursDB.get(label);

      if (groupeDB) {
        const { id: groupeInstructeursId, instructeurs } = groupeDB;
        const groupeDBEmailsToRemove: Set<string> = new Set(instructeurs);
        const groupeDBEmailToAdd: Set<string> = new Set();

        for (const { email } of groupeAPIEmails) {
          if (groupeDBEmailsToRemove.has(email)) {
            // the email is in both, that's cool
            groupeDBEmailsToRemove.delete(email);
          } else {
            // the email is in the group in the API, but not yet in the DB
            groupeDBEmailToAdd.add(email);
          }
        }
        // Only emails absent from the API response remain in groupeDBEmailsToRemove.

        let addEmailsInGroupe = Promise.resolve();
        let deleteEmailsInGroupe = Promise.resolve();

        if (groupeDBEmailToAdd.size >= 1) {
          addEmailsInGroupe = addPersonnesToGroupeByEmails(
            groupeInstructeursId,
            groupeDBEmailToAdd,
            databaseConnection,
          );
        }

        if (groupeDBEmailsToRemove.size >= 1) {
          deleteEmailsInGroupe = deletePersonnesFromGroupeByEmail(
            groupeInstructeursId,
            groupeDBEmailsToRemove,
            databaseConnection,
          );
        }

        return Promise.all([addEmailsInGroupe, deleteEmailsInGroupe]);
      } else {
        // the groupes d'instructeurs in the API and absent from the DB were created in créerGroupesInstructeurs
        // so nothing to do
        return Promise.resolve();
      }
    }),
  );

  // Add the potentially missing instructeurId
  const instructeurEmailToId: Map<API_DS.Instructeur["email"], API_DS.Instructeur["id"]> =
    new Map();
  for (const groupeInstructeursAPI of groupesInstructeursAPI) {
    for (const { email, id } of groupeInstructeursAPI.instructeurs) {
      instructeurEmailToId.set(email, id);
    }
  }

  const completionInstructeurIds = createInstructeurCapsAndCompleteInstructeurIds(
    instructeurEmailToId,
    demarcheNumber,
    databaseConnection,
  );

  //groupesInstructeursManquantsEnBDDCréés.catch(err => console.error("groupesInstructeursManquantsEnBDDCréés", err))
  //groupesInstructeursEnTropEnBDDSupprimés.catch(err => console.error("groupesInstructeursEnTropEnBDDSupprimés", err))
  //miseÀJourEmailsDansGroupe.catch(err => console.error("miseÀJourEmailsDansGroupe", err))
  //complétionInstructeurIds.catch(err => console.error("complétionInstructeurIds", err))

  await Promise.all([
    groupesInstructeursMissingFromDBCreated,
    extraGroupesInstructeursInDBDeleted,
    updateEmailsInGroupe,
    completionInstructeurIds,
  ]);

  return await deleteNowInaccessibleSuivis(demarcheNumber, databaseConnection);
}
