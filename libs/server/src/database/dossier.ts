import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { getAttachmentAutresForDossier } from "./attachmentAutre.ts";
import { getDecisionsAdministratives } from "./decision_administrative.ts";
import { getPrescriptions } from "./prescription.ts";
import { getControles } from "./controle.ts";
import { normalisationEmail } from "@pitchou/common/manipulationStrings.ts";

import type { default as Dossier, DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { default as Personne } from "@pitchou/types/database/public/Personne.ts";
import type { default as Message } from "@pitchou/types/database/public/Message.ts";
import type { default as EvenementPhaseDossier } from "@pitchou/types/database/public/EvenementPhaseDossier.ts";
import type {
  default as AvisExpert,
  AvisExpertInitializer,
} from "@pitchou/types/database/public/AvisExpert.ts";
import type { default as DecisionAdministrative } from "@pitchou/types/database/public/DecisionAdministrative.ts";
import type { default as Prescription } from "@pitchou/types/database/public/Prescription.ts";
import type { default as Controle } from "@pitchou/types/database/public/Controle.ts";
import type { default as CapDossier } from "@pitchou/types/database/public/CapDossier.ts";
import type * as API_DS_SCHEMA from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type {
  DossierPourInsert,
  DossierPourUpdate,
} from "@pitchou/types/demarche-numerique/DossierPourSynchronisation.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type AretePersonneSuitDossier from "@pitchou/types/database/public/AretePersonneSuitDossier.ts";
import type {
  DossierComplet,
  DossierResume,
  FrontEndDecisionAdministrative,
  FrontEndFichier,
  FrontEndPrescription,
} from "@pitchou/types/API_Pitchou.ts";
import type { PartialBy, PickNonNullable } from "@pitchou/types/tools.d.ts";
import type { AttachmentAutreWithFileDescription } from "./attachmentAutre.ts";
import type File from "@pitchou/types/database/public/File.ts";

/**
 * Fetch the Pitchou ids from the DS ids (not the numéro)
 *
 * PPP: it's a bit weird to use the DS ids, we could use the numéros
 */
export function getDossierIdsFromDS_Ids(
  DS_ids: Dossier["id_demarches_simplifiées"][],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<
  PickNonNullable<Dossier, "id" | "id_demarches_simplifiées" | "number_demarches_simplifiées">[]
> {
  return databaseConnection("dossier")
    .select(["id", "id_demarches_simplifiées", "number_demarches_simplifiées"])
    .whereIn("id_demarches_simplifiées", DS_ids);
}

export async function dumpDossierMessages(
  idToMessages: Map<Dossier["id"], API_DS_SCHEMA.Message[]>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  const messages: Partial<Message>[] = [];

  for (const [dossierId, apiMessages] of idToMessages) {
    for (const { id, body, createdAt, email } of apiMessages) {
      messages.push({
        contenu: body,
        date: new Date(createdAt),
        email_expéditeur: email,
        id_démarches_simplifiées: id,
        dossier: dossierId,
      });
    }
  }

  return databaseConnection("message")
    .insert(messages)
    .onConflict("id_démarches_simplifiées")
    .merge();
}

/**
 * Cette fonction est sensible
 * Appeler dossiersAccessibleViaCap avant
 */
export async function getDossierMessages(
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Partial<Message>[] | null> {
  return databaseConnection("message")
    .select(["contenu", "date", "email_expéditeur"])
    .where({ dossier: dossierId });
}

const varcharKeys: (keyof Pick<Dossier, "nom" | "ddep_nécessaire">)[] = ["nom", "ddep_nécessaire"];

type DecisionAdministrativeToInsert = NonNullable<
  DossierPourInsert["décision_administrative"]
>[number];

/**
 * Keeps only the decisions administratives whose (dossier, fichier) pair
 * is not already present in the database.
 */
async function getDecisionsAdministrativesNotInDB(
  decisions: DecisionAdministrativeToInsert[],
  databaseConnection: Knex.Transaction | Knex,
): Promise<DecisionAdministrativeToInsert[]> {
  const fichiers = decisions
    .map((decision) => decision.fichier)
    .filter(
      (fichier): fichier is NonNullable<DecisionAdministrative["fichier"]> =>
        fichier !== undefined && fichier !== null,
    );

  if (fichiers.length === 0) {
    return decisions;
  }

  const decisionsInDB = await databaseConnection("décision_administrative")
    .select(["dossier", "fichier"])
    .whereIn("fichier", fichiers);

  const dossierFichierKey = (decision: DecisionAdministrativeToInsert) =>
    `${decision.dossier}:${decision.fichier}`;

  const keysInDB = new Set(decisionsInDB.map(dossierFichierKey));

  const isAlreadyInDB = (decision: DecisionAdministrativeToInsert) =>
    keysInDB.has(dossierFichierKey(decision));

  const newDecisions = decisions.filter((decision) => !isAlreadyInDB(decision));

  return newDecisions;
}

export async function dumpDossiers(
  dossiersPourInsert: DossierPourInsert[],
  dossiersPourUpdate: DossierPourUpdate[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  for (const { dossier: d } of [...dossiersPourInsert, ...dossiersPourUpdate]) {
    for (const k of varcharKeys) {
      if (typeof d[k] === "string" && d[k].length >= 255) {
        console.warn(
          "Attontion !! Dossier DS numéro",
          d.number_demarches_simplifiées,
          "key",
          k,
          ".length >= 255",
        );
        console.warn("Valeur:", d[k]);

        console.warn(`La valeur est coupée pour qu'elle rentre en base de données`);
        // @ts-ignore
        d[k] = d[k].slice(0, 255);
      }
    }
  }

  let updatePromises: Knex.QueryBuilder<any, any>[] = [];

  const aretePersonneSuitDossierDossier: AretePersonneSuitDossier[] = [];

  let avisExpertDossier: PartialBy<AvisExpertInitializer, "dossier">[] = [];

  if (dossiersPourUpdate.length >= 1) {
    updatePromises = dossiersPourUpdate.map(({ dossier: dossierToUpdate }) => {
      return databaseConnection("dossier")
        .where("number_demarches_simplifiées", dossierToUpdate.number_demarches_simplifiées)
        .update(dossierToUpdate)
        .returning(["id", "number_demarches_simplifiées", "id_demarches_simplifiées"]);
    });
  }

  let synchronizePersonnesAndRelationsSuiviForInsertedDossiersP: Promise<any> = Promise.resolve([]);

  if (dossiersPourInsert.length >= 1) {
    let insertedDossierIds: { id: DossierId }[] = await databaseConnection("dossier")
      .insert(dossiersPourInsert.map((tables) => tables.dossier))
      .returning(["id"]);

    const allPersonnesWhoFollow = await synchronizeAndReturnPersonnesForDossiersToInsert(
      dossiersPourInsert,
      databaseConnection,
    );

    if (allPersonnesWhoFollow.length >= 1) {
      insertedDossierIds.forEach((insertedDossierId, index) => {
        const { personnes_qui_suivent, évènement_phase_dossier } = dossiersPourInsert[index];
        const emailsWhoFollow = new Set(personnes_qui_suivent?.map((p) => p.email));

        //Warning, here there is a risk of performance problems with the filter
        const personnesWhoFollowThisDossier = allPersonnesWhoFollow.filter(
          (p) => p.email && emailsWhoFollow.has(p.email),
        );

        personnesWhoFollowThisDossier.forEach((personne) => {
          aretePersonneSuitDossierDossier.push({
            dossier: insertedDossierId.id,
            personne: personne.id,
          });
        });

        if (personnesWhoFollowThisDossier.length >= 1) {
          évènement_phase_dossier.forEach((ev) => {
            if (!ev.cause_personne) {
              // In the front-end, we want to display the phase events with a non-null cause_personne.
              ev.cause_personne = personnesWhoFollowThisDossier[0].id;
            }
          });
        }
      });
    }

    avisExpertDossier = dossiersPourInsert
      .map((tables) => tables.avis_expert)
      .filter((x) => x !== undefined)
      .flat();

    // Add the new Dossier['id'] to the data that needs it
    insertedDossierIds.forEach((insertedDossierId, index) => {
      // assumes that postgres returns the ids in the same order as the array passed to `.insert`
      const { évènement_phase_dossier, avis_expert, décision_administrative } =
        dossiersPourInsert[index];

      if (Array.isArray(évènement_phase_dossier) && évènement_phase_dossier.length >= 1) {
        évènement_phase_dossier.forEach((ev) => (ev.dossier = insertedDossierId.id));
      }
      if (Array.isArray(avis_expert) && avis_expert.length >= 1) {
        avis_expert.forEach((ae) => (ae.dossier = insertedDossierId.id));
      }
      if (Array.isArray(décision_administrative) && décision_administrative.length >= 1) {
        décision_administrative.forEach((da) => (da.dossier = insertedDossierId.id));
      }
    });
  }

  const allDossiers = [...dossiersPourUpdate, ...dossiersPourInsert];

  const evenementsPhaseDossier = allDossiers
    .map((tables) => tables.évènement_phase_dossier)
    .filter((x) => x !== undefined)
    .flat();

  const decisionAdministrativeDossier = allDossiers
    .map((tables) => tables.décision_administrative)
    .filter((x) => x !== undefined)
    .flat();

  const decisionsAdministrativesToInsert = await getDecisionsAdministrativesNotInDB(
    decisionAdministrativeDossier,
    databaseConnection,
  );

  const databaseOperations = [
    evenementsPhaseDossier.length > 0
      ? databaseConnection("évènement_phase_dossier")
          .insert(evenementsPhaseDossier)
          .onConflict(["dossier", "phase", "horodatage"])
          .merge()
      : Promise.resolve([]),

    avisExpertDossier.length > 0
      ? databaseConnection("avis_expert").insert(avisExpertDossier)
      : Promise.resolve([]),

    decisionsAdministrativesToInsert.length > 0
      ? databaseConnection("décision_administrative").insert(decisionsAdministrativesToInsert)
      : Promise.resolve([]),

    aretePersonneSuitDossierDossier.length > 0
      ? databaseConnection("arête_personne_suit_dossier")
          .insert(aretePersonneSuitDossierDossier)
          .onConflict(["personne", "dossier"])
          .ignore()
      : Promise.resolve([]),

    synchronizePersonnesAndRelationsSuiviForInsertedDossiersP,

    ...updatePromises,
  ];

  return Promise.all(databaseOperations);
}

export async function synchronizeDossierInGroupeInstructeur(
  dossierDS: any,
  demarcheNumber: number,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  const dossierNumberDSToIdP = databaseConnection("dossier")
    .select(["id", "number_demarches_simplifiées"])
    .whereIn(
      "number_demarches_simplifiées",
      dossierDS.map((d: { number: string }) => d.number),
    )
    .then((dossiers) => {
      const dossierNumberDSToId = new Map();
      for (const { id, number_demarches_simplifiées } of dossiers) {
        dossierNumberDSToId.set(number_demarches_simplifiées, id);
      }
      return dossierNumberDSToId;
    });

  const groupeInstructeursLabelToIdP = databaseConnection("groupe_instructeurs")
    .select(["id", "nom"])
    .where({ numéro_démarche: demarcheNumber })
    .then((groupesInstructeurs) => {
      const groupeInstructeursLabelToId = new Map();
      for (const { id, nom } of groupesInstructeurs) {
        groupeInstructeursLabelToId.set(nom, id);
      }
      return groupeInstructeursLabelToId;
    });

  const dossierNumberDSToId = await dossierNumberDSToIdP;
  const groupeInstructeursLabelToId = await groupeInstructeursLabelToIdP;

  const aretesGroupeTnstructeurs_Dossier = dossierDS.map(
    // @ts-ignore
    ({ number, groupeInstructeur: { label } }) => {
      const dossierId = dossierNumberDSToId.get(String(number));
      const groupe_instructeursId = groupeInstructeursLabelToId.get(label);

      if (!groupe_instructeursId) {
        throw new Error(`groupe_instructeursId manquant pour groupe ${label}`);
      }

      return { dossier: dossierId, groupe_instructeurs: groupe_instructeursId };
    },
  );

  return databaseConnection("arête_groupe_instructeurs__dossier")
    .insert(aretesGroupeTnstructeurs_Dossier)
    .onConflict("dossier")
    .merge(["groupe_instructeurs"]);
}

const colonnesDossierComplet: (keyof DossierComplet)[] = [
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "dossier.id as id",
  //"id_demarches_simplifiées",
  "number_demarches_simplifiées",
  "numéro_démarche",
  "date_dépôt",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "dossier.nom as nom",
  "description",

  "date_début_intervention",
  "date_fin_intervention",
  "durée_intervention",

  "justification_absence_autre_solution_satisfaisante",
  "motif_dérogation",
  "justification_motif_dérogation",

  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "file_espèces_impactées.id as espèces_impactées_id",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "file_espèces_impactées.nom as espèces_impactées_nom",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "file_espèces_impactées.media_type as espèces_impactées_media_type",
  "rattaché_au_régime_ae",
  "activité_principale",

  // localisation
  "départements",
  "communes",
  "régions",
  "cartographie_projet",

  // next expected action
  "prochaine_action_attendue_par",

  // déposant
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "déposant.nom as déposant_nom",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "déposant.prénoms as déposant_prénoms",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "déposant.email as déposant_email",

  // demandeur_personne_physique
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "demandeur_personne_physique.nom as demandeur_personne_physique_nom",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "demandeur_personne_physique.prénoms as demandeur_personne_physique_prénoms",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "demandeur_personne_physique.email as demandeur_personne_physique_email",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "demandeur_personne_physique.address as demandeur_personne_physique_address",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "demandeur_personne_physique.phone as demandeur_personne_physique_phone",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "demandeur_personne_physique.role as demandeur_personne_physique_role",

  // demandeur_personne_morale
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "demandeur_personne_morale.siret as demandeur_personne_morale_siret",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "demandeur_personne_morale.raison_sociale as demandeur_personne_morale_raison_sociale",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "demandeur_personne_morale.adresse as demandeur_personne_morale_adresse",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "demandeur_personne_morale.siren as demandeur_personne_morale_siren",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "demandeur_personne_morale.legal_form as demandeur_personne_morale_legal_form",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "demandeur_personne_morale.naf_code as demandeur_personne_morale_naf_code",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "demandeur_personne_morale.naf_label as demandeur_personne_morale_naf_label",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "demandeur_personne_morale.creation_date as demandeur_personne_morale_creation_date",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "demandeur_personne_morale.admin_status as demandeur_personne_morale_admin_status",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "demandeur_personne_morale.headcount as demandeur_personne_morale_headcount",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "demandeur_personne_morale.share_capital as demandeur_personne_morale_share_capital",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "demandeur_personne_morale.insee_code as demandeur_personne_morale_insee_code",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "demandeur_personne_morale.postal_code as demandeur_personne_morale_postal_code",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "demandeur_personne_morale.department as demandeur_personne_morale_department",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "demandeur_personne_morale.region as demandeur_personne_morale_region",

  // representative (personne in charge of the project within the personne morale)
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "representative.nom as representative_nom",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "representative.prénoms as representative_prénoms",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "representative.email as representative_email",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "representative.phone as representative_phone",
  //@ts-expect-error not exactly a keyof DossierComplet, but still
  "representative.role as representative_role",

  // private annotations
  "ddep_nécessaire",

  "scientifique_type_demande",
  "scientifique_bilan_antérieur",
  "scientifique_finalité_demande",
  "scientifique_description_protocole_suivi",
  "scientifique_mode_capture",
  "scientifique_modalités_source_lumineuses",
  "scientifique_modalités_marquage",
  "scientifique_modalités_transport",
  "scientifique_périmètre_intervention",
  "scientifique_intervenants",
  "scientifique_précisions_autres_intervenants",

  "enjeu",
  "commentaire_libre",
  "historique_identifiant_demande_onagre",

  "date_debut_consultation_public",
  "date_fin_consultation_public",

  "mesures_erc_prévues",
  "mesures_er_suffisantes",

  "nombre_nids_compensés_dossier_oiseau_simple",
  "nombre_nids_détruits_dossier_oiseau_simple",

  "type",

  "etat_des_lieux_ecologique_complet_realise",
  "presence_especes_dans_aire_influence",
  "risque_malgre_mesures_erc",
  "date_mise_en_service",
];

export function listAllDossiersComplets(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DossierComplet[]> {
  return databaseConnection("dossier")
    .select(colonnesDossierComplet)
    .leftJoin("personne as déposant", { "déposant.id": "dossier.déposant" })
    .leftJoin("personne as demandeur_personne_physique", {
      "demandeur_personne_physique.id": "dossier.demandeur_personne_physique",
    })
    .leftJoin("personne as representative", {
      "representative.id": "dossier.representative",
    })
    .leftJoin("entreprise as demandeur_personne_morale", {
      "demandeur_personne_morale.siret": "dossier.demandeur_personne_morale",
    })
    .leftJoin("file as file_espèces_impactées", {
      "file_espèces_impactées.id": "dossier.espèces_impactées",
    })
    .then((dossiers) => {
      for (const dossier of dossiers) {
        const id_fichier_especes_impactees = dossier.espèces_impactées_id;
        if (id_fichier_especes_impactees) {
          dossier.url_fichier_espèces_impactées = `/especes-impactees/${id_fichier_especes_impactees}`;
        }
      }
      return dossiers;
    });
}

type AvisExpertWithFichierDescriptions = AvisExpert & {
  avis_fichier_nom: File["nom"];
  avis_fichier_media_type: File["media_type"];
  avis_fichier_taille: number | null;
  saisine_fichier_nom: File["nom"];
  saisine_fichier_media_type: File["media_type"];
  saisine_fichier_taille: number | null;
};

type DecisionAdministrativeWithFichierDescription = DecisionAdministrative & {
  fichier_nom: File["nom"];
  fichier_media_type: File["media_type"];
  fichier_taille: number | null;
};

function describeFichier(
  id: File["id"] | null | undefined,
  nom: File["nom"],
  media_type: File["media_type"],
  taille: number | null,
  route: string,
): FrontEndFichier | undefined {
  if (!id) {
    return undefined;
  }

  return {
    url: `${route}/${id}`,
    nom,
    media_type,
    taille,
  };
}

export async function getDossierComplet(
  dossierId: DossierComplet["id"],
  cap: CapDossier["cap"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DossierComplet | undefined> {
  let transaction: Knex.Transaction;

  if (databaseConnection.isTransaction) {
    //@ts-expect-error Knex is badly typed and does not understand that databaseConnection is of type Knex.Transaction
    transaction = databaseConnection;
  } else {
    transaction = await databaseConnection.transaction({ readOnly: true });
  }

  const accessibleDossierId = await dossiersAccessibleViaCap(dossierId, cap, transaction);

  if (!accessibleDossierId.has(dossierId)) {
    if (!databaseConnection.isTransaction) {
      // transaction created by hand, release it before throwing
      await transaction.commit();
    }
    throw new TypeError(`Le dossier ${dossierId} n'est pas accessible via la cap ${cap}`);
  }

  const dossierP: Promise<
    DossierComplet & {
      espèces_impactées_id?: FileId | null;
      espèces_impactées_media_type?: string;
      espèces_impactées_nom?: string;
      demandeur_personne_morale_adresse?: string;
    }
  > = transaction("dossier")
    .select(colonnesDossierComplet)
    .join("arête_groupe_instructeurs__dossier", {
      "arête_groupe_instructeurs__dossier.dossier": "dossier.id",
    })
    .join("arête_cap_dossier__groupe_instructeurs", {
      "arête_cap_dossier__groupe_instructeurs.groupe_instructeurs":
        "arête_groupe_instructeurs__dossier.groupe_instructeurs",
    })
    .leftJoin("personne as déposant", { "déposant.id": "dossier.déposant" })
    .leftJoin("personne as demandeur_personne_physique", {
      "demandeur_personne_physique.id": "dossier.demandeur_personne_physique",
    })
    .leftJoin("personne as representative", {
      "representative.id": "dossier.representative",
    })
    .leftJoin("entreprise as demandeur_personne_morale", {
      "demandeur_personne_morale.siret": "dossier.demandeur_personne_morale",
    })
    .leftJoin("file as file_espèces_impactées", {
      "file_espèces_impactées.id": "dossier.espèces_impactées",
    })
    .where({ "arête_cap_dossier__groupe_instructeurs.cap_dossier": cap })
    .andWhere({ "dossier.id": dossierId })
    .first();

  const evenementsPhaseDossierP: Promise<EvenementPhaseDossier[]> = getEvenementsPhaseDossier(
    dossierId,
    transaction,
  );

  const allAvisExpertDossierP: Promise<AvisExpertWithFichierDescriptions[]> =
    getAvisExpertDossier(dossierId, transaction);

  const descriptionsPiecesJointesPetitionnaireP: Promise<
    (Pick<File, "DS_createdAt" | "id" | "nom" | "media_type"> & { taille: number })[]
  > = getDescriptionsPiecesJointesPetitionnaire(dossierId, transaction);

  const decisionsAdministrativesP: Promise<DecisionAdministrativeWithFichierDescription[]> =
    getDecisionAdministrativesDossier(dossierId, transaction);
  const attachmentAutresPromise: Promise<AttachmentAutreWithFileDescription[]> =
    getAttachmentAutresForDossier(dossierId, transaction);
  const decisionIds = (await decisionsAdministrativesP).map((d) => d.id);

  const prescriptionsP: Promise<Prescription[]> = getPrescriptions(decisionIds, transaction);
  const prescriptionIds = (await prescriptionsP).map((d) => d.id);

  const controlesP: Promise<Controle[]> = getControles(prescriptionIds, transaction);

  if (!databaseConnection.isTransaction) {
    // transaction local to this function
    // so we close it manually
    Promise.all([
      dossierP,
      evenementsPhaseDossierP,
      allAvisExpertDossierP,
      descriptionsPiecesJointesPetitionnaireP,
      decisionsAdministrativesP,
      attachmentAutresPromise,
      prescriptionsP,
      controlesP,
    ])
      .then(transaction.commit)
      .catch(transaction.rollback);
  }

  return Promise.all([
    dossierP,
    evenementsPhaseDossierP,
    allAvisExpertDossierP,
    descriptionsPiecesJointesPetitionnaireP,
    decisionsAdministrativesP,
    attachmentAutresPromise,
    prescriptionsP,
    controlesP,
  ]).then(
    ([
      dossier,
      evenementsPhaseDossier,
      allAvisExpertDossier,
      descriptionsPiecesJointesPetitionnaire,
      decisionsAdministratives,
      attachmentAutres,
      prescriptions,
      controles,
    ]) => {
      dossier.demandeur_adresse =
        dossier.demandeur_personne_morale_adresse ||
        dossier.demandeur_personne_physique_address ||
        "";
      delete dossier.demandeur_personne_morale_adresse;

      dossier.évènementsPhase = evenementsPhaseDossier;

      dossier.avisExpert = allAvisExpertDossier.map(
        ({
          avis_fichier,
          avis_fichier_nom,
          avis_fichier_media_type,
          avis_fichier_taille,
          saisine_fichier,
          saisine_fichier_nom,
          saisine_fichier_media_type,
          saisine_fichier_taille,
          ...avisExpert
        }) => {
          const avisFichierDescription = describeFichier(
            avis_fichier,
            avis_fichier_nom,
            avis_fichier_media_type,
            avis_fichier_taille,
            "/avis-expert/fichier",
          );
          const saisineFichierDescription = describeFichier(
            saisine_fichier,
            saisine_fichier_nom,
            saisine_fichier_media_type,
            saisine_fichier_taille,
            "/avis-expert/fichier",
          );

          return {
            ...avisExpert,
            avis_fichier_url: avisFichierDescription?.url,
            saisine_fichier_url: saisineFichierDescription?.url,
            avis_fichier_description: avisFichierDescription,
            saisine_fichier_description: saisineFichierDescription,
          };
        },
      );

      dossier.piècesJointesPétitionnaires = descriptionsPiecesJointesPetitionnaire.map(
        ({ id, DS_createdAt, nom, media_type, taille }) => ({
          url: `/piece-jointe-petitionnaire/fichier/${id}`,
          DS_createdAt,
          nom,
          media_type,
          taille,
        }),
      );

      if (
        dossier.espèces_impactées_id &&
        dossier.espèces_impactées_media_type &&
        dossier.espèces_impactées_nom
      ) {
        dossier.espècesImpactées = {
          url: `/especes-impactees/${dossier.espèces_impactées_id}`,
          media_type: dossier.espèces_impactées_media_type,
          nom: dossier.espèces_impactées_nom,
        };
      }

      delete dossier.espèces_impactées_id;
      delete dossier.espèces_impactées_media_type;
      delete dossier.espèces_impactées_nom;

      const controlesByPrescriptionId: Map<Prescription["id"], Controle[]> = new Map();
      for (const c of controles) {
        const id = c.prescription;
        const controlesForThisId = controlesByPrescriptionId.get(id) || [];
        controlesForThisId.push(c);
        controlesByPrescriptionId.set(id, controlesForThisId);
      }

      const prescriptionsByDecisionId: Map<DecisionAdministrative["id"], FrontEndPrescription[]> =
        new Map();
      for (const p of prescriptions) {
        const controles = controlesByPrescriptionId.get(p.id);
        // @ts-ignore p devient un FrontEndPrescription
        p.contrôles = controles;

        const id = p.décision_administrative;
        const prescrForThisId = prescriptionsByDecisionId.get(id) || [];

        // @ts-ignore p est devenu un FrontEndPrescription
        prescrForThisId.push(p);
        prescriptionsByDecisionId.set(id, prescrForThisId);
      }

      if (decisionsAdministratives.length >= 1) {
        dossier.décisionsAdministratives = decisionsAdministratives.map(
          ({
            id,
            numéro,
            type,
            date_signature,
            date_fin_obligations,
            fichier,
            fichier_nom,
            fichier_media_type,
            fichier_taille,
            dossier,
          }) => {
            const fichierDescription = describeFichier(
              fichier,
              fichier_nom,
              fichier_media_type,
              fichier_taille,
              "/decision-administrative/fichier",
            );

            return {
              id,
              numéro,
              type,
              date_signature,
              date_fin_obligations,
              prescriptions: prescriptionsByDecisionId.get(id),
              fichier_url: fichierDescription?.url,
              fichier_description: fichierDescription,
              dossier,
            };
          },
        );
      }

      dossier.attachmentAutres = attachmentAutres.map(
        ({ fichier, fichier_nom, fichier_media_type, fichier_taille, ...attachment }) => {
          const fileDescription = describeFichier(
            fichier,
            fichier_nom,
            fichier_media_type,
            fichier_taille,
            "/attachment-autre/fichier",
          );

          return {
            ...attachment,
            fichier,
            fichier_url: fileDescription?.url,
            fichier_description: fileDescription,
          };
        },
      );

      return dossier;
    },
  );
}

const colonnesDossierResume: (keyof DossierResume)[] = [
  //@ts-expect-error not exactly a keyof DossierRésumé, but still
  "dossier.id as id",
  //"id_demarches_simplifiées",
  "number_demarches_simplifiées",
  "date_dépôt",
  //@ts-expect-error not exactly a keyof DossierRésumé, but still
  "dossier.nom as nom",
  "rattaché_au_régime_ae",
  "activité_principale",

  // localisation
  "départements",
  "communes",
  "régions",

  // next expected action
  "prochaine_action_attendue_par",

  // déposant
  //@ts-expect-error not exactly a keyof DossierRésumé, but still
  "déposant.nom as déposant_nom",
  //@ts-expect-error not exactly a keyof DossierRésumé, but still
  "déposant.prénoms as déposant_prénoms",

  // demandeur_personne_physique
  //@ts-expect-error not exactly a keyof DossierRésumé, but still
  "demandeur_personne_physique.nom as demandeur_personne_physique_nom",
  //@ts-expect-error not exactly a keyof DossierRésumé, but still
  "demandeur_personne_physique.prénoms as demandeur_personne_physique_prénoms",

  // demandeur_personne_morale
  //@ts-expect-error not exactly a keyof DossierRésumé, but still
  "demandeur_personne_morale.siret as demandeur_personne_morale_siret",
  //@ts-expect-error not exactly a keyof DossierRésumé, but still
  "demandeur_personne_morale.raison_sociale as demandeur_personne_morale_raison_sociale",

  "enjeu",

  "commentaire_libre",

  "historique_identifiant_demande_onagre",
];

export async function getDossiersResumesByCap(
  cap: CapDossier["cap"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DossierResume[]> {
  let transaction: Knex.Transaction;

  if (databaseConnection.isTransaction) {
    //@ts-expect-error Knex is badly typed and does not understand that databaseConnection is of type Knex.Transaction
    transaction = databaseConnection;
  } else {
    transaction = await databaseConnection.transaction({ readOnly: true });
  }

  const dossiersP: Promise<DossierResume[]> = transaction("dossier")
    .select(colonnesDossierResume)
    .join("arête_groupe_instructeurs__dossier", {
      "arête_groupe_instructeurs__dossier.dossier": "dossier.id",
    })
    .join("arête_cap_dossier__groupe_instructeurs", {
      "arête_cap_dossier__groupe_instructeurs.groupe_instructeurs":
        "arête_groupe_instructeurs__dossier.groupe_instructeurs",
    })
    .leftJoin("personne as déposant", { "déposant.id": "dossier.déposant" })
    .leftJoin("personne as demandeur_personne_physique", {
      "demandeur_personne_physique.id": "dossier.demandeur_personne_physique",
    })
    .leftJoin("entreprise as demandeur_personne_morale", {
      "demandeur_personne_morale.siret": "dossier.demandeur_personne_morale",
    })
    .where({ "arête_cap_dossier__groupe_instructeurs.cap_dossier": cap });

  const evenementsPhaseDossierP = getLatestEvenementsPhaseDossiers(cap, transaction);

  const decisionsAdministrativesP = getDecisionsAdministratives(cap, transaction);

  const result = Promise.all([dossiersP, evenementsPhaseDossierP, decisionsAdministrativesP]).then(
    ([dossiers, evenementsPhaseDossier, decisionsAdministratives]) => {
      const evenementsPhaseDossierById: Map<Dossier["id"], EvenementPhaseDossier> = new Map();

      for (const evenementPhaseDossier of evenementsPhaseDossier) {
        evenementsPhaseDossierById.set(evenementPhaseDossier.dossier, evenementPhaseDossier);
      }

      for (const dossier of dossiers) {
        const evenementPhaseDossier = evenementsPhaseDossierById.get(dossier.id);

        if (evenementPhaseDossier) {
          dossier.phase = evenementPhaseDossier.phase;
          dossier.date_début_phase = evenementPhaseDossier.horodatage;
        } else {
          // dossier submission
          dossier.phase = "Accompagnement amont";
          dossier.date_début_phase = dossier.date_dépôt;
        }
      }

      const decisionsAdministrativesById: Map<Dossier["id"], FrontEndDecisionAdministrative[]> =
        new Map();
      for (const decisionAdministrative of decisionsAdministratives) {
        const decisionsAdministrativesForThisId =
          decisionsAdministrativesById.get(decisionAdministrative.dossier) || [];
        decisionsAdministrativesForThisId.push(decisionAdministrative);
        decisionsAdministrativesById.set(
          decisionAdministrative.dossier,
          decisionsAdministrativesForThisId,
        );
      }

      for (const dossier of dossiers) {
        const decisionAdministrative = decisionsAdministrativesById.get(dossier.id);

        if (decisionAdministrative) {
          dossier.décisionsAdministratives = decisionAdministrative;
        }
      }

      return dossiers;
    },
  );

  if (!databaseConnection.isTransaction) {
    // transaction local to this function
    // so we close it manually
    Promise.all([dossiersP, evenementsPhaseDossierP])
      .then(transaction.commit)
      .catch(transaction.rollback);
  }

  return result;
}

/**
 * retourne le sous-ensemble de dossierIds accessibles via la cap
 */
export async function dossiersAccessibleViaCap(
  dossierIds: Dossier["id"] | Dossier["id"][],
  cap: CapDossier["cap"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Set<Dossier["id"]>> {
  if (!Array.isArray(dossierIds)) dossierIds = [dossierIds];

  const ret = databaseConnection("arête_cap_dossier__groupe_instructeurs")
    .select(["dossier.id as id"])
    .leftJoin("arête_groupe_instructeurs__dossier", {
      "arête_groupe_instructeurs__dossier.groupe_instructeurs":
        "arête_cap_dossier__groupe_instructeurs.groupe_instructeurs",
    })
    .leftJoin("dossier", { "dossier.id": "arête_groupe_instructeurs__dossier.dossier" })
    .whereIn("dossier.id", dossierIds)
    .andWhere({ "arête_cap_dossier__groupe_instructeurs.cap_dossier": cap })
    .then((dossiers) => new Set(dossiers.map((d) => d.id)));

  // @ts-ignore
  return ret;
}

/**
 * Fetches only the current (most recent) phase for each dossier
 * The query uses a distinctOn trick (specific to Postgresql) to achieve this
 */
export async function getLatestEvenementsPhaseDossiers(
  cap_dossier: CapDossier["cap"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<EvenementPhaseDossier[]> {
  return databaseConnection("évènement_phase_dossier")
    .select(["évènement_phase_dossier.dossier as dossier", "phase", "horodatage"])
    .join("arête_groupe_instructeurs__dossier", {
      "arête_groupe_instructeurs__dossier.dossier": "évènement_phase_dossier.dossier",
    })
    .join("arête_cap_dossier__groupe_instructeurs", {
      "arête_cap_dossier__groupe_instructeurs.groupe_instructeurs":
        "arête_groupe_instructeurs__dossier.groupe_instructeurs",
    })
    .where({ "arête_cap_dossier__groupe_instructeurs.cap_dossier": cap_dossier })
    .distinctOn("dossier")
    .andWhere(function () {
      // DS creates bad "traitement" that are not phase changes
      // We can detect them with 'DS_emailAgentTraitant IS NULL'
      // If an évènement_phase_dossier has neither a 'cause_personne' nor a 'DS_emailAgentTraitant',
      // we don't want to reflect it on the interface side
      this.whereNotNull("cause_personne").orWhereNotNull("DS_emailAgentTraitant");
    })
    .orderBy([
      { column: "dossier", order: "asc" },
      { column: "horodatage", order: "desc" },
    ]);
}

export async function getEvenementsPhaseDossiers(
  cap_dossier: CapDossier["cap"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<EvenementPhaseDossier[]> {
  return databaseConnection("évènement_phase_dossier")
    .select(["évènement_phase_dossier.dossier as dossier", "phase", "horodatage"])
    .join("arête_groupe_instructeurs__dossier", {
      "arête_groupe_instructeurs__dossier.dossier": "évènement_phase_dossier.dossier",
    })
    .join("arête_cap_dossier__groupe_instructeurs", {
      "arête_cap_dossier__groupe_instructeurs.groupe_instructeurs":
        "arête_groupe_instructeurs__dossier.groupe_instructeurs",
    })
    .where({ "arête_cap_dossier__groupe_instructeurs.cap_dossier": cap_dossier })
    .andWhere(function () {
      // DS creates bad "traitement" that are not phase changes
      // We can detect them with 'DS_emailAgentTraitant IS NULL'
      // If an évènement_phase_dossier has neither a 'cause_personne' nor a 'DS_emailAgentTraitant',
      // we don't want to reflect it on the interface side
      this.whereNotNull("cause_personne").orWhereNotNull("DS_emailAgentTraitant");
    });
}

async function getEvenementsPhaseDossier(
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<EvenementPhaseDossier[]> {
  return databaseConnection("évènement_phase_dossier")
    .select("*")
    .where({ dossier: dossierId })
    .andWhere(function () {
      // DS creates bad "traitement" that are not phase changes
      // We can detect them with 'DS_emailAgentTraitant IS NULL'
      // If an évènement_phase_dossier has neither a 'cause_personne' nor a 'DS_emailAgentTraitant',
      // we don't want to reflect it on the interface side
      this.whereNotNull("cause_personne").orWhereNotNull("DS_emailAgentTraitant");
    })
    .orderBy("horodatage", "desc");
}

async function getAvisExpertDossier(
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<AvisExpertWithFichierDescriptions[]> {
  return databaseConnection("avis_expert")
    .select([
      "avis_expert.*",
      "file_avis.nom as avis_fichier_nom",
      "file_avis.media_type as avis_fichier_media_type",
      databaseConnection.raw("file_avis.taille::integer as avis_fichier_taille"),
      "file_saisine.nom as saisine_fichier_nom",
      "file_saisine.media_type as saisine_fichier_media_type",
      databaseConnection.raw("file_saisine.taille::integer as saisine_fichier_taille"),
    ])
    .leftJoin("file as file_avis", { "file_avis.id": "avis_expert.avis_fichier" })
    .leftJoin("file as file_saisine", { "file_saisine.id": "avis_expert.saisine_fichier" })
    .where({ dossier: dossierId });
}

async function getDecisionAdministrativesDossier(
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DecisionAdministrativeWithFichierDescription[]> {
  return databaseConnection("décision_administrative")
    .select([
      "décision_administrative.*",
      "file_decision.nom as fichier_nom",
      "file_decision.media_type as fichier_media_type",
      databaseConnection.raw("file_decision.taille::integer as fichier_taille"),
    ])
    .leftJoin("file as file_decision", { "file_decision.id": "décision_administrative.fichier" })
    .where({ dossier: dossierId });
}

async function getDescriptionsPiecesJointesPetitionnaire(
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<(Pick<File, "DS_createdAt" | "id" | "nom" | "media_type"> & { taille: number })[]> {
  return databaseConnection("dossier")
    .select([
      "file.id as id",
      "file.DS_createdAt as DS_createdAt",
      "file.nom as nom",
      "file.media_type as media_type",
      databaseConnection.raw("file.taille::integer as taille"),
    ])
    .leftJoin("arête_dossier__fichier_pièces_jointes_pétitionnaire", {
      "arête_dossier__fichier_pièces_jointes_pétitionnaire.dossier": "dossier.id",
    })
    .leftJoin("file", {
      "file.id": "arête_dossier__fichier_pièces_jointes_pétitionnaire.fichier",
    })
    .where({ dossier: dossierId });
}

export function deleteDossierByDSNumber(numbers: number[]) {
  return directDatabaseConnection("dossier")
    .whereIn("number_demarches_simplifiées", numbers)
    .delete();
}

export function updateDossier(
  id: Dossier["id"],
  dossierParams: Partial<Dossier & { évènementsPhase: EvenementPhaseDossier[] }>,
  causePersonne: Personne["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  let phaseAdded = Promise.resolve();

  if (dossierParams.évènementsPhase) {
    for (const ev of dossierParams.évènementsPhase) {
      ev.cause_personne = causePersonne;
    }

    phaseAdded = databaseConnection("évènement_phase_dossier").insert(
      dossierParams.évènementsPhase,
    );

    delete dossierParams.évènementsPhase;
  }

  let updatedDossier = Promise.resolve();

  if (Object.keys(dossierParams).length >= 1) {
    updatedDossier = databaseConnection("dossier").where({ id }).update(dossierParams);
  }

  return Promise.all([phaseAdded, updatedDossier]);
}

/**
 * Synchronizes and returns the personnes of the dossiers to insert.
 */
async function synchronizeAndReturnPersonnesForDossiersToInsert(
  dossiersPourInsert: DossierPourInsert[],
  databaseConnection: Knex.Transaction | Knex,
) {
  let personnes: Personne[] = [];

  //@ts-ignore
  const personnesWhoFollowDossiers: Pick<Personne, "email" | "nom" | "prénoms">[] =
    dossiersPourInsert
      .flatMap((dossier) => dossier.personnes_qui_suivent)
      .filter((x) => x != null)
      // We only select the properties we want to keep (not code_accès)
      .map(({ email, nom, prénoms }) => ({
        email: email ? normalisationEmail(email) : null,
        nom,
        prénoms,
      }));

  if (personnesWhoFollowDossiers.length >= 1) {
    await databaseConnection("personne")
      .insert(personnesWhoFollowDossiers)
      .onConflict(["email"])
      .ignore();

    const emails = personnesWhoFollowDossiers.map((p) => p?.email).filter((x) => x != null);

    personnes = await databaseConnection("personne").select("id", "email").whereIn("email", emails);
  }
  return personnes;
}
