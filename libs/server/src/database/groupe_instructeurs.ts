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
  const groupesInstructeursBDD = await databaseConnection("groupe_instructeurs")
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

  for (const { id_groupe, nom_groupe, email } of groupesInstructeursBDD) {
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

async function creerGroupesInstructeurs(
  groupesInstructeursAPI: API_DS.GroupeInstructeurs[],
  instructeurParEmail: Map<Personne["email"], Partial<Personne>>,
  demarcheNumber: number,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  //console.log('créerGroupesInstructeurs', instructeurParEmail)

  const nomsGroupes = groupesInstructeursAPI.map((g) => ({
    nom: g.label,
    numéro_démarche: demarcheNumber,
  }));

  // Create the groupes d'instructeurs in the DB
  const nouveauxGroupesP = databaseConnection("groupe_instructeurs")
    .insert(nomsGroupes)
    .returning(["id", "nom"]);

  //console.log('instructeurParEmail insert', [...instructeurParEmail.values()].map(({code_accès}) => ({personne_cap: code_accès})))

  // Create the cap_dossier for the instructeurs who don't have one
  await databaseConnection("cap_dossier")
    .insert(
      [...instructeurParEmail.values()].map(({ code_accès }) => ({ personne_cap: code_accès })),
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
      [...instructeurParEmail.values()].map(({ code_accès }) => code_accès),
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

  for (const { code_accès, email } of instructeurParEmail.values()) {
    codeAccesByEmail.set(email, code_accès);
  }

  const aretes = await Promise.all([nouveauxGroupesP, capDossierByCodeAccesP]).then(
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

async function supprimerGroupesInstructeurs(
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

  const instructeurPersonnesSansCode = await databaseConnection("personne")
    .select("*")
    .whereIn("email", emailsInstructeur)
    .where("code_accès", null);

  //console.log('instructeurPersonnesSansCode', instructeurPersonnesSansCode)

  if (instructeurPersonnesSansCode.length >= 1) {
    const instructeurPersonnesAvecCodeARajouter = instructeurPersonnesSansCode.map(({ id }) => ({
      id,
      code_accès: Math.random().toString(36).slice(2),
    }));

    // add a code_accès to the instructeur.rice.s who don't have one
    await databaseConnection("personne")
      .insert(instructeurPersonnesAvecCodeARajouter)
      .onConflict("id")
      .merge(["code_accès"]);
  }

  return databaseConnection("personne")
    .select(["id", "email", "code_accès"])
    .whereIn("email", emailsInstructeur);
}

async function ajouterPersonnesDansGroupeParEmails(
  groupe_instructeurs: GroupeInstructeurs["id"],
  emails: Set<NonNullable<Personne["email"]>>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  //console.log('ajouterPersonnesDansGroupeParEmails', groupe_instructeurs, emails)

  // Find the instructeurs for whom a cap_dossier is missing
  const instructeursSansDossierCap = await databaseConnection("personne")
    .select("code_accès")
    .whereIn("email", [...emails])
    .leftJoin("cap_dossier", { "personne.code_accès": "cap_dossier.personne_cap" })
    .whereNull("cap");

  //console.log('instructeursSansDossierCap', instructeursSansDossierCap)

  // add the missing cap_dossier
  if (instructeursSansDossierCap.length >= 1) {
    await databaseConnection("cap_dossier")
      .insert(instructeursSansDossierCap.map(({ code_accès }) => ({ personne_cap: code_accès })))
      .onConflict("personne_cap")
      .ignore();
  }

  const capDossierPourCesEmails = await databaseConnection("personne")
    .select("cap")
    .whereIn("email", [...emails])
    .leftJoin("cap_dossier", { "personne.code_accès": "cap_dossier.personne_cap" });

  //console.log('capDossierPourCesEmails', capDossierPourCesEmails)

  const aretes = capDossierPourCesEmails.map(({ cap: cap_dossier }) => ({
    groupe_instructeurs,
    cap_dossier,
  }));

  return databaseConnection("arête_cap_dossier__groupe_instructeurs").insert(aretes);
}

async function supprimerPersonnesDansGroupeParEmail(
  groupe_instructeurs: GroupeInstructeurs["id"],
  emails: Set<NonNullable<Personne["email"]>>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  //console.log('supprimerPersonnesDansGroupeParEmail', groupe_instructeurs, emails)

  const capDossierPourCesEmails = await databaseConnection("personne")
    .select("cap")
    .whereIn("email", [...emails])
    .leftJoin("cap_dossier", { "personne.code_accès": "cap_dossier.personne_cap" });

  return databaseConnection("arête_cap_dossier__groupe_instructeurs")
    .whereIn(
      ["groupe_instructeurs", "cap_dossier"],
      capDossierPourCesEmails.map(({ cap: cap_dossier }) => [groupe_instructeurs, cap_dossier]),
    )
    .delete();
}

/**
 * Enforces the invariant "you can't follow a dossier you don't have access to":
 * for the given démarche, deletes every follow (arête_personne_suit_dossier) whose
 * personne no longer has an access path to the dossier through
 * cap_dossier → groupe_instructeurs → dossier.
 */
export async function supprimerSuivisDevenusInaccessibles(
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

async function creerInstructeurCapsEtCompleterInstructeurIds(
  instructeurEmailToId: Map<API_DS.Instructeur["email"], API_DS.Instructeur["id"]>,
  demarcheNumber: number,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  //console.log('instructeurEmailToId', instructeurEmailToId)

  // find the Personne with one of the instructeur emails who already have a code d'accès
  // @ts-ignore
  const personnesAvecCodeP: Promise<Partial<Personne>[]> = databaseConnection("personne")
    .select(["code_accès", "email"])
    .whereIn("email", [...instructeurEmailToId.keys()])
    .andWhereNot({ code_accès: null });

  // Delete the cap_écriture_annotation for the instructeur_id that no longer exist
  const deleteAbsentInstructeurIdsP = databaseConnection("cap_écriture_annotation")
    .whereNotIn("instructeur_id", [...instructeurEmailToId.values()])
    .delete();

  // Delete the cap_dossier for the instructeurs who no longer exist in this démarche
  const deleteAbsentInstructeurCapDossier = personnesAvecCodeP.then((personnesAvecCode) => {
    // @ts-ignore
    const codes: string[] = personnesAvecCode.map(({ code_accès }) => code_accès);

    const capsDeCetteDemarche = databaseConnection("arête_cap_dossier__groupe_instructeurs")
      .select("cap_dossier")
      .whereIn(
        "groupe_instructeurs",
        databaseConnection("groupe_instructeurs")
          .select("id")
          .where({ numéro_démarche: demarcheNumber }),
      );

    return databaseConnection("cap_dossier")
      .whereNotIn("personne_cap", codes)
      .whereIn("cap", capsDeCetteDemarche)
      .delete();
  });

  // Add the cap_écriture_annotation for the new instructeurId if there are any
  const instructeurIdAndEcritureCapsP = databaseConnection("cap_écriture_annotation")
    .insert([...instructeurEmailToId.values()].map((instructeur_id) => ({ instructeur_id })))
    .onConflict("instructeur_id")
    .ignore();

  // Add the cap_dossier for the new instructeurId if there are any
  const instructeurDossierCapsP = personnesAvecCodeP.then((personnesAvecCode) => {
    // @ts-ignore
    const codes: string[] = personnesAvecCode.map(({ code_accès }) => code_accès);

    return databaseConnection("cap_dossier")
      .insert(codes.map((code) => ({ personne_cap: code })))
      .onConflict("personne_cap")
      .ignore();
  });

  // Add the cap_dossier for the new instructeurId if there are any
  const instructeurEvenementMetriqueCapsP = personnesAvecCodeP.then((personnesAvecCode) => {
    // @ts-ignore
    const codes: string[] = personnesAvecCode.map(({ code_accès }) => code_accès);

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
    personnesAvecCodeP,
    instructeurIdToEcritureAnnotationCapP,
    deleteAbsentInstructeurCapDossier,
    instructeurDossierCapsP,
    instructeurEvenementMetriqueCapsP,
  ]).then(([personnesAvecCode, instructeurIdToCaps]) => {
    //console.log('personnesAvecCode', personnesAvecCode)
    //console.log('instructeurIdToCaps', instructeurIdToCaps)

    const personneCodeToCapEcritureAnnotation = [];

    for (const { code_accès, email } of personnesAvecCode) {
      // @ts-ignore
      const instructeurId = instructeurEmailToId.get(email);
      // @ts-ignore
      const capEcritureAnnotationCorrespondante = instructeurIdToCaps.get(instructeurId);

      personneCodeToCapEcritureAnnotation.push({
        personne_cap: code_accès,
        écriture_annotation_cap: capEcritureAnnotationCorrespondante,
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
export async function synchroniserGroupesInstructeurs(
  groupesInstructeursAPI: API_DS.GroupeInstructeurs[],
  demarcheNumber: number,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  const instructeursEnBDD = await createAndReturnInstructeurPersonne([
    ...new Set(
      groupesInstructeursAPI
        .map(({ instructeurs }) => instructeurs.map(({ email }) => email))
        .flat(Infinity) as string[],
    ),
  ]);

  const instructeurParEmail = new Map(instructeursEnBDD.map((i) => [i.email, i]));

  //console.log('instructeurParEmail', instructeurParEmail)

  const groupesInstructeursBDD = await getGroupesInstructeurs(demarcheNumber, databaseConnection);

  //console.log('groupesInstructeursAPI', groupesInstructeursAPI)
  //console.log('synchroniserGroupesInstructeurs', groupesInstructeursBDD)

  // Create in the DB the groups that are not there yet
  const groupesInstructeursDansDSAbsentEnBDD = groupesInstructeursAPI.filter(
    ({ label }) => !groupesInstructeursBDD.has(label),
  );

  //console.log('groupesInstructeursDansDSAbsentEnBDD', groupesInstructeursDansDSAbsentEnBDD)

  const groupesInstructeursManquantsEnBDDCrees =
    groupesInstructeursDansDSAbsentEnBDD.length >= 1
      ? creerGroupesInstructeurs(
          groupesInstructeursDansDSAbsentEnBDD,
          instructeurParEmail,
          demarcheNumber,
          databaseConnection,
        )
      : Promise.resolve();

  // Delete in the DB the groups that are absent from DS
  const groupesInstructeursEnBDDAbsentsDansDS = new Map(
    [...groupesInstructeursBDD].filter(
      ([nom_groupe]) => !groupesInstructeursAPI.find(({ label }) => label === nom_groupe),
    ),
  );

  //console.log('groupesInstructeurs En BDD Absents Dans DS (donc à supprimer)', groupesInstructeursEnBDDAbsentsDansDS)

  const groupesInstructeursEnTropEnBDDSupprimes =
    groupesInstructeursEnBDDAbsentsDansDS.size >= 1
      ? supprimerGroupesInstructeurs(
          [...groupesInstructeursEnBDDAbsentsDansDS.values()].map(({ id }) => id),
          databaseConnection,
        )
      : Promise.resolve();

  // For the groups that are present in both, find the groups that need
  // an update of the list of personnes
  const miseAJourEmailsDansGroupe = Promise.all(
    groupesInstructeursAPI.map(({ label, instructeurs: groupeAPIEmails }) => {
      const groupeBDD = groupesInstructeursBDD.get(label);

      if (groupeBDD) {
        const { id: idGroupeInstructeurs, instructeurs } = groupeBDD;
        const groupeBDDEmailsAEnlever: Set<string> = new Set(instructeurs);
        const groupeBDDEmailAAJouter: Set<string> = new Set();

        for (const { email } of groupeAPIEmails) {
          if (groupeBDDEmailsAEnlever.has(email)) {
            // the email is in both, that's cool
            groupeBDDEmailsAEnlever.delete(email);
          } else {
            // the email is in the group in the API, but not yet in the DB
            groupeBDDEmailAAJouter.add(email);
          }
        }
        // at the end of this operation, in groupeBDDEmailsÀEnlever,
        // the emails to remove remain (because they are absent from the API response)

        //console.log('groupeBDD', label)
        //console.log('groupeBDDEmailÀAJouter', groupeBDDEmailÀAJouter)
        //console.log('groupeBDDEmailsÀEnlever', groupeBDDEmailsÀEnlever)

        let ajoutEmailsDansGroupe = Promise.resolve();
        let suppressionEmailsDansGroupe = Promise.resolve();

        if (groupeBDDEmailAAJouter.size >= 1) {
          ajoutEmailsDansGroupe = ajouterPersonnesDansGroupeParEmails(
            idGroupeInstructeurs,
            groupeBDDEmailAAJouter,
            databaseConnection,
          );
        }

        if (groupeBDDEmailsAEnlever.size >= 1) {
          suppressionEmailsDansGroupe = supprimerPersonnesDansGroupeParEmail(
            idGroupeInstructeurs,
            groupeBDDEmailsAEnlever,
            databaseConnection,
          );
        }

        return Promise.all([ajoutEmailsDansGroupe, suppressionEmailsDansGroupe]);
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

  const completionInstructeurIds = creerInstructeurCapsEtCompleterInstructeurIds(
    instructeurEmailToId,
    demarcheNumber,
    databaseConnection,
  );

  //groupesInstructeursManquantsEnBDDCréés.catch(err => console.error("groupesInstructeursManquantsEnBDDCréés", err))
  //groupesInstructeursEnTropEnBDDSupprimés.catch(err => console.error("groupesInstructeursEnTropEnBDDSupprimés", err))
  //miseÀJourEmailsDansGroupe.catch(err => console.error("miseÀJourEmailsDansGroupe", err))
  //complétionInstructeurIds.catch(err => console.error("complétionInstructeurIds", err))

  await Promise.all([
    groupesInstructeursManquantsEnBDDCrees,
    groupesInstructeursEnTropEnBDDSupprimes,
    miseAJourEmailsDansGroupe,
    completionInstructeurIds,
  ]);

  return await supprimerSuivisDevenusInaccessibles(demarcheNumber, databaseConnection);
}
