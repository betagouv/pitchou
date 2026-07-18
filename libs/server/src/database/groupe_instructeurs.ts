import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import type { default as Personne } from "@pitchou/types/database/public/Personne.ts";
import type { default as GroupeInstructeurs } from "@pitchou/types/database/public/GroupeInstructeurs.ts";
import type { default as CapEcritureAnnotation } from "@pitchou/types/database/public/CapEcritureAnnotation.ts";
import type * as API_DS from "@pitchou/types/demarche-numerique/apiSchema.ts";

async function getGroupesInstructeurs(
  demarcheNumber: number,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<
  Map<
    GroupeInstructeurs["nom"],
    { id: GroupeInstructeurs["id"]; instructeurs: Set<NonNullable<Personne["email"]>> }
  >
> {
  const groupesInstructeursDB = await databaseConnection("groupe_instructeurs")
    .select([
      "groupe_instructeurs.id as id_groupe",
      "groupe_instructeurs.nom as nom_groupe",
      "email",
    ])
    .leftJoin("arête_cap_dossier__groupe_instructeurs", {
      "arête_cap_dossier__groupe_instructeurs.groupe_instructeurs": "groupe_instructeurs.id",
    })
    .leftJoin("cap_dossier", {
      "cap_dossier.cap": "arête_cap_dossier__groupe_instructeurs.cap_dossier",
    })
    .leftJoin("personne", { "personne.code_accès": "cap_dossier.personne_cap" })
    .where({ numéro_démarche: demarcheNumber });

  const groupeByNom = new Map();

  for (const { id_groupe, nom_groupe, email } of groupesInstructeursDB) {
    const groupeInstructeurs = groupeByNom.get(nom_groupe) || {
      id: id_groupe,
      instructeurs: new Set(),
    };
    // the email is null if the group in the database is empty
    if (email) {
      groupeInstructeurs.instructeurs.add(email);
    }
    groupeByNom.set(nom_groupe, groupeInstructeurs);
  }

  return groupeByNom;
}

async function createGroupesInstructeurs(
  groupesInstructeursAPI: API_DS.GroupeInstructeurs[],
  instructeurByEmail: Map<Personne["email"], Partial<Personne>>,
  demarcheNumber: number,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  //console.log('créerGroupesInstructeurs', instructeurByEmail)

  const nomsGroupes = groupesInstructeursAPI.map((g) => ({
    nom: g.label,
    numéro_démarche: demarcheNumber,
  }));

  // Create the groupes d'instructeurs in the DB
  const newGroupesP = databaseConnection("groupe_instructeurs")
    .insert(nomsGroupes)
    .returning(["id", "nom"]);

  //console.log('instructeurByEmail insert', [...instructeurByEmail.values()].map(({code_accès}) => ({personne_cap: code_accès})))

  // Create the cap_dossier for the instructeurs who don't have one
  await databaseConnection("cap_dossier")
    .insert(
      [...instructeurByEmail.values()].map(({ code_accès }) => ({ personne_cap: code_accès })),
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
      [...instructeurByEmail.values()].map(({ code_accès }) => code_accès),
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

  for (const { code_accès, email } of instructeurByEmail.values()) {
    codeAccesByEmail.set(email, code_accès);
  }

  const aretes = await Promise.all([newGroupesP, capDossierByCodeAccesP]).then(
    ([nouveauxGroupes, capDossierByCodeAcces]) => {
      return groupesInstructeursAPI
        .map(({ label, instructeurs }) => {
          const groupe_instructeurs = nouveauxGroupes.find((g) => g.nom === label).id;

          return instructeurs.map(({ email }) => {
            const code_accès = codeAccesByEmail.get(email);
            const cap_dossier = capDossierByCodeAcces.get(code_accès);

            return { groupe_instructeurs, cap_dossier };
          });
        })
        .flat(Infinity);
    },
  );

  //console.log('arêtes', arêtes)

  return databaseConnection("arête_cap_dossier__groupe_instructeurs").insert(aretes);
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
): Promise<Pick<Personne, "id" | "email" | "code_accès">[]> {
  // Create the personnes of the instructeur.rices
  await databaseConnection("personne")
    .insert(
      emailsInstructeur.map((email) => ({
        email,
        code_accès: Math.random().toString(36).slice(2),
      })),
    )
    .onConflict("email")
    .ignore();

  const instructeurPersonnesWithoutCode = await databaseConnection("personne")
    .select("*")
    .whereIn("email", emailsInstructeur)
    .where("code_accès", null);

  //console.log('instructeurPersonnesWithoutCode', instructeurPersonnesWithoutCode)

  if (instructeurPersonnesWithoutCode.length >= 1) {
    const instructeurPersonnesWithCodeToAdd = instructeurPersonnesWithoutCode.map(({ id }) => ({
      id,
      code_accès: Math.random().toString(36).slice(2),
    }));

    // add a code_accès to the instructeur.rice.s who don't have one
    await databaseConnection("personne")
      .insert(instructeurPersonnesWithCodeToAdd)
      .onConflict("id")
      .merge(["code_accès"]);
  }

  return databaseConnection("personne")
    .select(["id", "email", "code_accès"])
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
    .select("code_accès")
    .whereIn("email", [...emails])
    .leftJoin("cap_dossier", { "personne.code_accès": "cap_dossier.personne_cap" })
    .whereNull("cap");

  //console.log('instructeursWithoutDossierCap', instructeursWithoutDossierCap)

  // add the missing cap_dossier
  if (instructeursWithoutDossierCap.length >= 1) {
    await databaseConnection("cap_dossier")
      .insert(instructeursWithoutDossierCap.map(({ code_accès }) => ({ personne_cap: code_accès })))
      .onConflict("personne_cap")
      .ignore();
  }

  const capDossierForTheseEmails = await databaseConnection("personne")
    .select("cap")
    .whereIn("email", [...emails])
    .leftJoin("cap_dossier", { "personne.code_accès": "cap_dossier.personne_cap" });

  //console.log('capDossierForTheseEmails', capDossierForTheseEmails)

  const aretes = capDossierForTheseEmails.map(({ cap: cap_dossier }) => ({
    groupe_instructeurs,
    cap_dossier,
  }));

  return databaseConnection("arête_cap_dossier__groupe_instructeurs").insert(aretes);
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
    .leftJoin("cap_dossier", { "personne.code_accès": "cap_dossier.personne_cap" });

  return databaseConnection("arête_cap_dossier__groupe_instructeurs")
    .whereIn(
      ["groupe_instructeurs", "cap_dossier"],
      capDossierForTheseEmails.map(({ cap: cap_dossier }) => [groupe_instructeurs, cap_dossier]),
    )
    .delete();
}

/**
 * Enforces the invariant "you can't follow a dossier you don't have access to":
 * for the given démarche, deletes every follow (arête_personne_suit_dossier) whose
 * personne no longer has an access path to the dossier through
 * cap_dossier → groupe_instructeurs → dossier.
 */
export async function deleteNowInaccessibleSuivis(
  demarcheNumber: number,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  await databaseConnection("arête_personne_suit_dossier")
    .whereIn(
      "dossier",
      databaseConnection("dossier").select("id").where({ numéro_démarche: demarcheNumber }),
    )
    // keep only follows for which the personne has NO remaining access path to the dossier
    .whereNotExists(function () {
      this.select("personne.id")
        .from("personne")
        .join("cap_dossier", "cap_dossier.personne_cap", "personne.code_accès")
        .join(
          "arête_cap_dossier__groupe_instructeurs",
          "arête_cap_dossier__groupe_instructeurs.cap_dossier",
          "cap_dossier.cap",
        )
        .join(
          "arête_groupe_instructeurs__dossier",
          "arête_groupe_instructeurs__dossier.groupe_instructeurs",
          "arête_cap_dossier__groupe_instructeurs.groupe_instructeurs",
        )
        .where("personne.id", databaseConnection.ref("arête_personne_suit_dossier.personne"))
        .where(
          "arête_groupe_instructeurs__dossier.dossier",
          databaseConnection.ref("arête_personne_suit_dossier.dossier"),
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
    .select(["code_accès", "email"])
    .whereIn("email", [...instructeurEmailToId.keys()])
    .andWhereNot({ code_accès: null });

  // Delete the cap_écriture_annotation for the instructeur_id that no longer exist
  const deleteAbsentInstructeurIdsP = databaseConnection("cap_écriture_annotation")
    .whereNotIn("instructeur_id", [...instructeurEmailToId.values()])
    .delete();

  // Delete the cap_dossier for the instructeurs who no longer exist in this démarche
  const deleteAbsentInstructeurCapDossier = personnesWithCodeP.then((personnesWithCode) => {
    // @ts-ignore
    const codes: string[] = personnesWithCode.map(({ code_accès }) => code_accès);

    const capsOfThisDemarche = databaseConnection("arête_cap_dossier__groupe_instructeurs")
      .select("cap_dossier")
      .whereIn(
        "groupe_instructeurs",
        databaseConnection("groupe_instructeurs")
          .select("id")
          .where({ numéro_démarche: demarcheNumber }),
      );

    return databaseConnection("cap_dossier")
      .whereNotIn("personne_cap", codes)
      .whereIn("cap", capsOfThisDemarche)
      .delete();
  });

  // Add the cap_écriture_annotation for the new instructeurId if there are any
  const instructeurIdAndEcritureCapsP = databaseConnection("cap_écriture_annotation")
    .insert([...instructeurEmailToId.values()].map((instructeur_id) => ({ instructeur_id })))
    .onConflict("instructeur_id")
    .ignore();

  // Add the cap_dossier for the new instructeurId if there are any
  const instructeurDossierCapsP = personnesWithCodeP.then((personnesWithCode) => {
    // @ts-ignore
    const codes: string[] = personnesWithCode.map(({ code_accès }) => code_accès);

    return databaseConnection("cap_dossier")
      .insert(codes.map((code) => ({ personne_cap: code })))
      .onConflict("personne_cap")
      .ignore();
  });

  // Add the cap_dossier for the new instructeurId if there are any
  const instructeurEvenementMetriqueCapsP = personnesWithCodeP.then((personnesWithCode) => {
    // @ts-ignore
    const codes: string[] = personnesWithCode.map(({ code_accès }) => code_accès);

    return databaseConnection("cap_évènement_métrique")
      .insert(codes.map((code) => ({ personne_cap: code })))
      .onConflict("personne_cap")
      .ignore();
  });

  const instructeurIdToEcritureAnnotationCapP = Promise.all([
    deleteAbsentInstructeurIdsP,
    instructeurIdAndEcritureCapsP,
  ])
    .then(() =>
      databaseConnection("cap_écriture_annotation")
        .select(["cap", "instructeur_id"])
        .whereIn("instructeur_id", [...instructeurEmailToId.values()]),
    )
    .then((instructeurIdAndCaps) => {
      const map: Map<CapEcritureAnnotation["instructeur_id"], CapEcritureAnnotation["cap"]> =
        new Map();

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

    const personneCodeToCapEcritureAnnotation = [];

    for (const { code_accès, email } of personnesWithCode) {
      // @ts-ignore
      const instructeurId = instructeurEmailToId.get(email);
      // @ts-ignore
      const matchingCapEcritureAnnotation = instructeurIdToCaps.get(instructeurId);

      personneCodeToCapEcritureAnnotation.push({
        personne_cap: code_accès,
        écriture_annotation_cap: matchingCapEcritureAnnotation,
      });
    }

    return databaseConnection("arête_personne__cap_écriture_annotation")
      .insert(personneCodeToCapEcritureAnnotation)
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
        // at the end of this operation, in groupeDBEmailsÀEnlever,
        // the emails to remove remain (because they are absent from the API response)

        //console.log('groupeDB', label)
        //console.log('groupeDBEmailÀAJouter', groupeDBEmailÀAJouter)
        //console.log('groupeDBEmailsÀEnlever', groupeDBEmailsÀEnlever)

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
