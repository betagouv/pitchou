import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import type { default as Personne } from "@pitchou/types/database/public/Personne.ts";
import type { default as GroupeInstructeurs } from "@pitchou/types/database/public/GroupeInstructeurs.ts";
import type { default as CapÉcritureAnnotation } from "@pitchou/types/database/public/CapÉcritureAnnotation.ts";
import type * as API_DS from "@pitchou/types/démarche-numérique/apiSchema.ts";

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
    // l'email est null si le groupe en base de données en vide
    if (email) {
      groupeInstructeurs.instructeurs.add(email);
    }
    groupeByNom.set(nom_groupe, groupeInstructeurs);
  }

  return groupeByNom;
}

async function créerGroupesInstructeurs(
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

  // Créer les groupes d'instructeurs en BDD
  const nouveauxGroupesP = databaseConnection("groupe_instructeurs")
    .insert(nomsGroupes)
    .returning(["id", "nom"]);

  //console.log('instructeurParEmail insert', [...instructeurParEmail.values()].map(({code_accès}) => ({personne_cap: code_accès})))

  // Créer les cap_dossier pour les instructeurs qui n'en ont pas
  await databaseConnection("cap_dossier")
    .insert(
      [...instructeurParEmail.values()].map(({ code_accès }) => ({ personne_cap: code_accès })),
    )
    .onConflict("personne_cap")
    .ignore();

  // recup les instructeurices avec cap dossier
  const capDossierByCodeAccèsP = databaseConnection("cap_dossier")
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

  const codeAccèsByEmail = new Map();

  for (const { code_accès, email } of instructeurParEmail.values()) {
    codeAccèsByEmail.set(email, code_accès);
  }

  const arêtes = await Promise.all([nouveauxGroupesP, capDossierByCodeAccèsP]).then(
    ([nouveauxGroupes, capDossierByCodeAccès]) => {
      return groupesInstructeursAPI
        .map(({ label, instructeurs }) => {
          const groupe_instructeurs = nouveauxGroupes.find((g) => g.nom === label).id;

          return instructeurs.map(({ email }) => {
            const code_accès = codeAccèsByEmail.get(email);
            const cap_dossier = capDossierByCodeAccès.get(code_accès);

            return { groupe_instructeurs, cap_dossier };
          });
        })
        .flat(Infinity);
    },
  );

  //console.log('arêtes', arêtes)

  return databaseConnection("arête_cap_dossier__groupe_instructeurs").insert(arêtes);
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
  // Créer les personnes des instructeur.rices
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
    const instructeurPersonnesAvecCodeÀRajouter = instructeurPersonnesSansCode.map(({ id }) => ({
      id,
      code_accès: Math.random().toString(36).slice(2),
    }));

    // rajouter un code_accès aux instructeur.rice.s qui n'en ont pas
    await databaseConnection("personne")
      .insert(instructeurPersonnesAvecCodeÀRajouter)
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

  // Trouver les instructeurs pour lesquels il manque une cap_dossier
  const instructeursSansDossierCap = await databaseConnection("personne")
    .select("code_accès")
    .whereIn("email", [...emails])
    .leftJoin("cap_dossier", { "personne.code_accès": "cap_dossier.personne_cap" })
    .whereNull("cap");

  //console.log('instructeursSansDossierCap', instructeursSansDossierCap)

  // rajouter les cap_dossier manquants
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

  const arêtes = capDossierPourCesEmails.map(({ cap: cap_dossier }) => ({
    groupe_instructeurs,
    cap_dossier,
  }));

  return databaseConnection("arête_cap_dossier__groupe_instructeurs").insert(arêtes);
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

async function créerInstructeurCapsEtCompléterInstructeurIds(
  instructeurEmailToId: Map<API_DS.Instructeur["email"], API_DS.Instructeur["id"]>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  //console.log('instructeurEmailToId', instructeurEmailToId)

  // chercher les Personne avec un des emails des instructeur qui ont déjà un code d'accès
  // @ts-ignore
  const personnesAvecCodeP: Promise<Partial<Personne>[]> = databaseConnection("personne")
    .select(["code_accès", "email"])
    .whereIn("email", [...instructeurEmailToId.keys()])
    .andWhereNot({ code_accès: null });

  // Supprimer les cap_écriture_annotation pour les instructeur_id qui n'existent plus
  const deleteAbsentInstructeurIdsP = databaseConnection("cap_écriture_annotation")
    .whereNotIn("instructeur_id", [...instructeurEmailToId.values()])
    .delete();

  // Supprimer les cap_dossier pour les instructeurs qui n'existent plus
  const deleteAbsentInstructeurCapDossier = personnesAvecCodeP.then((personnesAvecCode) => {
    // @ts-ignore
    const codes: string[] = personnesAvecCode.map(({ code_accès }) => code_accès);

    return databaseConnection("cap_dossier").whereNotIn("personne_cap", codes).delete();
  });

  // Rajouter les cap_écriture_annotation pour les nouveaux instructeurId s'il y en a
  const instructeurIdAndÉcritureCapsP = databaseConnection("cap_écriture_annotation")
    .insert([...instructeurEmailToId.values()].map((instructeur_id) => ({ instructeur_id })))
    .onConflict("instructeur_id")
    .ignore();

  // Rajouter les cap_dossier pour les nouveaux instructeurId s'il y en a
  const instructeurDossierCapsP = personnesAvecCodeP.then((personnesAvecCode) => {
    // @ts-ignore
    const codes: string[] = personnesAvecCode.map(({ code_accès }) => code_accès);

    return databaseConnection("cap_dossier")
      .insert(codes.map((code) => ({ personne_cap: code })))
      .onConflict("personne_cap")
      .ignore();
  });

  // Rajouter les cap_dossier pour les nouveaux instructeurId s'il y en a
  const instructeurÉvènementMétriqueCapsP = personnesAvecCodeP.then((personnesAvecCode) => {
    // @ts-ignore
    const codes: string[] = personnesAvecCode.map(({ code_accès }) => code_accès);

    return databaseConnection("cap_évènement_métrique")
      .insert(codes.map((code) => ({ personne_cap: code })))
      .onConflict("personne_cap")
      .ignore();
  });

  const instructeurIdToÉcritureAnnotationCapP = Promise.all([
    deleteAbsentInstructeurIdsP,
    instructeurIdAndÉcritureCapsP,
  ])
    .then(() =>
      databaseConnection("cap_écriture_annotation")
        .select(["cap", "instructeur_id"])
        .whereIn("instructeur_id", [...instructeurEmailToId.values()]),
    )
    .then((instructeurIdAndCaps) => {
      const map: Map<CapÉcritureAnnotation["instructeur_id"], CapÉcritureAnnotation["cap"]> =
        new Map();

      for (const { cap, instructeur_id } of instructeurIdAndCaps) {
        map.set(instructeur_id, cap);
      }

      return map;
    });

  return Promise.all([
    personnesAvecCodeP,
    instructeurIdToÉcritureAnnotationCapP,
    deleteAbsentInstructeurCapDossier,
    instructeurDossierCapsP,
    instructeurÉvènementMétriqueCapsP,
  ]).then(([personnesAvecCode, instructeurIdToCaps]) => {
    //console.log('personnesAvecCode', personnesAvecCode)
    //console.log('instructeurIdToCaps', instructeurIdToCaps)

    const personneCodeToCapÉcritureAnnotation = [];

    for (const { code_accès, email } of personnesAvecCode) {
      // @ts-ignore
      const instructeurId = instructeurEmailToId.get(email);
      // @ts-ignore
      const capÉcritureAnnotationCorrespondante = instructeurIdToCaps.get(instructeurId);

      personneCodeToCapÉcritureAnnotation.push({
        personne_cap: code_accès,
        écriture_annotation_cap: capÉcritureAnnotationCorrespondante,
      });
    }

    return databaseConnection("arête_personne__cap_écriture_annotation")
      .insert(personneCodeToCapÉcritureAnnotation)
      .onConflict("personne_cap")
      .merge();
  });
}

/**
 * Synchroniser le groupes instructeurs dans la base de données avec ceux qui viennent de l'API
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

  // Créer en BDD les groupes qui n'y sont pas encore
  const groupesInstructeursDansDSAbsentEnBDD = groupesInstructeursAPI.filter(
    ({ label }) => !groupesInstructeursBDD.has(label),
  );

  //console.log('groupesInstructeursDansDSAbsentEnBDD', groupesInstructeursDansDSAbsentEnBDD)

  const groupesInstructeursManquantsEnBDDCréés =
    groupesInstructeursDansDSAbsentEnBDD.length >= 1
      ? créerGroupesInstructeurs(
          groupesInstructeursDansDSAbsentEnBDD,
          instructeurParEmail,
          demarcheNumber,
          databaseConnection,
        )
      : Promise.resolve();

  // Supprimer en BDD les groupes qui sont absents de DS
  const groupesInstructeursEnBDDAbsentsDansDS = new Map(
    [...groupesInstructeursBDD].filter(
      ([nom_groupe]) => !groupesInstructeursAPI.find(({ label }) => label === nom_groupe),
    ),
  );

  //console.log('groupesInstructeurs En BDD Absents Dans DS (donc à supprimer)', groupesInstructeursEnBDDAbsentsDansDS)

  const groupesInstructeursEnTropEnBDDSupprimés =
    groupesInstructeursEnBDDAbsentsDansDS.size >= 1
      ? supprimerGroupesInstructeurs(
          [...groupesInstructeursEnBDDAbsentsDansDS.values()].map(({ id }) => id),
          databaseConnection,
        )
      : Promise.resolve();

  // Pour les groupes qui sont présents dans les deux, trouver les groupes qui ont besoin
  // d'une mise à jour de la liste des personnes
  const miseÀJourEmailsDansGroupe = Promise.all(
    groupesInstructeursAPI.map(({ label, instructeurs: groupeAPIEmails }) => {
      const groupeBDD = groupesInstructeursBDD.get(label);

      if (groupeBDD) {
        const { id: idGroupeInstructeurs, instructeurs } = groupeBDD;
        const groupeBDDEmailsÀEnlever: Set<string> = new Set(instructeurs);
        const groupeBDDEmailÀAJouter: Set<string> = new Set();

        for (const { email } of groupeAPIEmails) {
          if (groupeBDDEmailsÀEnlever.has(email)) {
            // l'email est dans les deux, c'est cool
            groupeBDDEmailsÀEnlever.delete(email);
          } else {
            // l'email est dans le groupe dans l'API, mais pas encore en BDD
            groupeBDDEmailÀAJouter.add(email);
          }
        }
        // à la fin de cette opération, dans groupeBDDEmailsÀEnlever,
        // il reste les emails à enlever (parce qu'ils sont absents de la réponse de l'API)

        //console.log('groupeBDD', label)
        //console.log('groupeBDDEmailÀAJouter', groupeBDDEmailÀAJouter)
        //console.log('groupeBDDEmailsÀEnlever', groupeBDDEmailsÀEnlever)

        let ajoutEmailsDansGroupe = Promise.resolve();
        let suppressionEmailsDansGroupe = Promise.resolve();

        if (groupeBDDEmailÀAJouter.size >= 1) {
          ajoutEmailsDansGroupe = ajouterPersonnesDansGroupeParEmails(
            idGroupeInstructeurs,
            groupeBDDEmailÀAJouter,
            databaseConnection,
          );
        }

        if (groupeBDDEmailsÀEnlever.size >= 1) {
          suppressionEmailsDansGroupe = supprimerPersonnesDansGroupeParEmail(
            idGroupeInstructeurs,
            groupeBDDEmailsÀEnlever,
            databaseConnection,
          );
        }

        return Promise.all([ajoutEmailsDansGroupe, suppressionEmailsDansGroupe]);
      } else {
        // les groupes d'instructeurs dans l'API et absents de la BDD ont été créé dans créerGroupesInstructeurs
        // donc rien à faire
        return Promise.resolve();
      }
    }),
  );

  // Rajouter les instructeurId potentiellement manquants
  const instructeurEmailToId: Map<API_DS.Instructeur["email"], API_DS.Instructeur["id"]> =
    new Map();
  for (const groupeInstructeursAPI of groupesInstructeursAPI) {
    for (const { email, id } of groupeInstructeursAPI.instructeurs) {
      instructeurEmailToId.set(email, id);
    }
  }

  const complétionInstructeurIds = créerInstructeurCapsEtCompléterInstructeurIds(
    instructeurEmailToId,
    databaseConnection,
  );

  //groupesInstructeursManquantsEnBDDCréés.catch(err => console.error("groupesInstructeursManquantsEnBDDCréés", err))
  //groupesInstructeursEnTropEnBDDSupprimés.catch(err => console.error("groupesInstructeursEnTropEnBDDSupprimés", err))
  //miseÀJourEmailsDansGroupe.catch(err => console.error("miseÀJourEmailsDansGroupe", err))
  //complétionInstructeurIds.catch(err => console.error("complétionInstructeurIds", err))

  return Promise.all([
    groupesInstructeursManquantsEnBDDCréés,
    groupesInstructeursEnTropEnBDDSupprimés,
    miseÀJourEmailsDansGroupe,
    complétionInstructeurIds,
  ]);
}
