import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import {
  getDécisionAdministratives,
  getDécisionsAdministratives,
} from "./décision_administrative.ts";
import { getPrescriptions } from "./prescription.ts";
import { getContrôles } from "./controle.ts";
import { normalisationEmail } from "@pitchou/common/manipulationStrings.ts";

import type { default as Dossier, DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { default as Personne } from "@pitchou/types/database/public/Personne.ts";
import type { default as Message } from "@pitchou/types/database/public/Message.ts";
import type { default as ÉvènementPhaseDossier } from "@pitchou/types/database/public/ÉvènementPhaseDossier.ts";
import type {
  default as AvisExpert,
  AvisExpertInitializer,
} from "@pitchou/types/database/public/AvisExpert.ts";
import type { default as DécisionAdministrative } from "@pitchou/types/database/public/DécisionAdministrative.ts";
import type { default as Prescription } from "@pitchou/types/database/public/Prescription.ts";
import type { default as Contrôle } from "@pitchou/types/database/public/Contrôle.ts";
import type { default as CapDossier } from "@pitchou/types/database/public/CapDossier.ts";
import type * as API_DS_SCHEMA from "@pitchou/types/démarche-numérique/apiSchema.ts";
import type {
  DossierPourInsert,
  DossierPourUpdate,
} from "@pitchou/types/démarche-numérique/DossierPourSynchronisation.ts";
import type { default as Fichier } from "@pitchou/types/database/public/Fichier.ts";
import type ArTePersonneSuitDossier from "@pitchou/types/database/public/ArêtePersonneSuitDossier.ts";
import type {
  DossierComplet,
  DossierRésumé,
  FrontEndDécisionAdministrative,
  FrontEndPrescription,
} from "@pitchou/types/API_Pitchou.ts";
import type { PartialBy, PickNonNullable } from "@pitchou/types/tools.d.ts";

/**
 * Récupérer les id Pitchou à partir des id DS (pas les numéro)
 *
 * PPP : c'est un peu bizarre d'utiliser les ids DS, on pourrait utiliser les numéros
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
    .filter((fichier): fichier is Fichier["id"] => fichier !== undefined && fichier !== null);

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

  const arêtePersonneSuitDossierDossier: ArTePersonneSuitDossier[] = [];

  let avisExpertDossier: PartialBy<AvisExpertInitializer, "dossier">[] = [];

  if (dossiersPourUpdate.length >= 1) {
    updatePromises = dossiersPourUpdate.map(({ dossier: dossierAModifier }) => {
      return databaseConnection("dossier")
        .where("number_demarches_simplifiées", dossierAModifier.number_demarches_simplifiées)
        .update(dossierAModifier)
        .returning(["id", "number_demarches_simplifiées", "id_demarches_simplifiées"]);
    });
  }

  let synchroniserPersonnesEtRelationsSuiviPourDossiersInsérésP: Promise<any> = Promise.resolve([]);

  if (dossiersPourInsert.length >= 1) {
    let insertedDossierIds: { id: DossierId }[] = await databaseConnection("dossier")
      .insert(dossiersPourInsert.map((tables) => tables.dossier))
      .returning(["id"]);

    const toutesLesPersonnesQuiSuivent = await synchroniserEtRetournerPersonnesPourDossiersInsérer(
      dossiersPourInsert,
      databaseConnection,
    );

    if (toutesLesPersonnesQuiSuivent.length >= 1) {
      insertedDossierIds.forEach((dossierInséréId, index) => {
        const { personnes_qui_suivent, évènement_phase_dossier } = dossiersPourInsert[index];
        const emailsQuiSuivent = new Set(personnes_qui_suivent?.map((p) => p.email));

        //Attention, ici il y a un risque de problèmes de performance avec le filter
        const personnesQuiSuiventCeDossier = toutesLesPersonnesQuiSuivent.filter(
          (p) => p.email && emailsQuiSuivent.has(p.email),
        );

        personnesQuiSuiventCeDossier.forEach((personne) => {
          arêtePersonneSuitDossierDossier.push({
            dossier: dossierInséréId.id,
            personne: personne.id,
          });
        });

        if (personnesQuiSuiventCeDossier.length >= 1) {
          évènement_phase_dossier.forEach((ev) => {
            if (!ev.cause_personne) {
              // Dans le front-end, on souhaite afficher les évènements phases avec une cause_personne non nulle.
              ev.cause_personne = personnesQuiSuiventCeDossier[0].id;
            }
          });
        }
      });
    }

    avisExpertDossier = dossiersPourInsert
      .map((tables) => tables.avis_expert)
      .filter((x) => x !== undefined)
      .flat();

    // Rajouter nouveaux les Dossier['id'] aux données qui en ont besoin
    insertedDossierIds.forEach((dossierInséréId, index) => {
      // suppose que postgres retourne les id dans le même ordre que le tableau passé à `.insert`
      const { évènement_phase_dossier, avis_expert, décision_administrative } =
        dossiersPourInsert[index];

      if (Array.isArray(évènement_phase_dossier) && évènement_phase_dossier.length >= 1) {
        évènement_phase_dossier.forEach((ev) => (ev.dossier = dossierInséréId.id));
      }
      if (Array.isArray(avis_expert) && avis_expert.length >= 1) {
        avis_expert.forEach((ae) => (ae.dossier = dossierInséréId.id));
      }
      if (Array.isArray(décision_administrative) && décision_administrative.length >= 1) {
        décision_administrative.forEach((da) => (da.dossier = dossierInséréId.id));
      }
    });
  }

  const tousLesDossiers = [...dossiersPourUpdate, ...dossiersPourInsert];

  const évènementsPhaseDossier = tousLesDossiers
    .map((tables) => tables.évènement_phase_dossier)
    .filter((x) => x !== undefined)
    .flat();

  const décisionAdministrativeDossier = tousLesDossiers
    .map((tables) => tables.décision_administrative)
    .filter((x) => x !== undefined)
    .flat();

  const decisionsAdministrativesToInsert = await getDecisionsAdministrativesNotInDB(
    décisionAdministrativeDossier,
    databaseConnection,
  );

  const databaseOperations = [
    évènementsPhaseDossier.length > 0
      ? databaseConnection("évènement_phase_dossier")
          .insert(évènementsPhaseDossier)
          .onConflict(["dossier", "phase", "horodatage"])
          .merge()
      : Promise.resolve([]),

    avisExpertDossier.length > 0
      ? databaseConnection("avis_expert").insert(avisExpertDossier)
      : Promise.resolve([]),

    decisionsAdministrativesToInsert.length > 0
      ? databaseConnection("décision_administrative").insert(decisionsAdministrativesToInsert)
      : Promise.resolve([]),

    arêtePersonneSuitDossierDossier.length > 0
      ? databaseConnection("arête_personne_suit_dossier")
          .insert(arêtePersonneSuitDossierDossier)
          .onConflict(["personne", "dossier"])
          .ignore()
      : Promise.resolve([]),

    synchroniserPersonnesEtRelationsSuiviPourDossiersInsérésP,

    ...updatePromises,
  ];

  return Promise.all(databaseOperations);
}

export async function synchroniserDossierDansGroupeInstructeur(
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

  const arêtesGroupeTnstructeurs_Dossier = dossierDS.map(
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
    .insert(arêtesGroupeTnstructeurs_Dossier)
    .onConflict("dossier")
    .merge(["groupe_instructeurs"]);
}

const colonnesDossierComplet: (keyof DossierComplet)[] = [
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "dossier.id as id",
  //"id_demarches_simplifiées",
  "number_demarches_simplifiées",
  "numéro_démarche",
  "date_dépôt",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "dossier.nom as nom",
  "description",

  "date_début_intervention",
  "date_fin_intervention",
  "durée_intervention",

  "justification_absence_autre_solution_satisfaisante",
  "motif_dérogation",
  "justification_motif_dérogation",

  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "fichier_espèces_impactées.id as espèces_impactées_id",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "fichier_espèces_impactées.nom as espèces_impactées_nom",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "fichier_espèces_impactées.media_type as espèces_impactées_media_type",
  "rattaché_au_régime_ae",
  "activité_principale",

  // localisation
  "départements",
  "communes",
  "régions",

  // prochaine action attendue
  "prochaine_action_attendue_par",

  // déposant
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "déposant.nom as déposant_nom",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "déposant.prénoms as déposant_prénoms",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "déposant.email as déposant_email",

  // demandeur_personne_physique
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "demandeur_personne_physique.nom as demandeur_personne_physique_nom",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "demandeur_personne_physique.prénoms as demandeur_personne_physique_prénoms",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "demandeur_personne_physique.email as demandeur_personne_physique_email",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "demandeur_personne_physique.address as demandeur_personne_physique_address",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "demandeur_personne_physique.phone as demandeur_personne_physique_phone",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "demandeur_personne_physique.role as demandeur_personne_physique_role",

  // demandeur_personne_morale
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "demandeur_personne_morale.siret as demandeur_personne_morale_siret",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "demandeur_personne_morale.raison_sociale as demandeur_personne_morale_raison_sociale",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "demandeur_personne_morale.adresse as demandeur_personne_morale_adresse",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "demandeur_personne_morale.siren as demandeur_personne_morale_siren",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "demandeur_personne_morale.legal_form as demandeur_personne_morale_legal_form",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "demandeur_personne_morale.naf_code as demandeur_personne_morale_naf_code",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "demandeur_personne_morale.naf_label as demandeur_personne_morale_naf_label",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "demandeur_personne_morale.creation_date as demandeur_personne_morale_creation_date",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "demandeur_personne_morale.admin_status as demandeur_personne_morale_admin_status",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "demandeur_personne_morale.headcount as demandeur_personne_morale_headcount",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "demandeur_personne_morale.share_capital as demandeur_personne_morale_share_capital",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "demandeur_personne_morale.insee_code as demandeur_personne_morale_insee_code",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "demandeur_personne_morale.postal_code as demandeur_personne_morale_postal_code",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "demandeur_personne_morale.department as demandeur_personne_morale_department",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "demandeur_personne_morale.region as demandeur_personne_morale_region",

  // representative (personne en charge du projet au sein de la personne morale)
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "representative.nom as representative_nom",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "representative.prénoms as representative_prénoms",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "representative.email as representative_email",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "representative.phone as representative_phone",
  //@ts-expect-error pas exactement une keyof DossierComplet, mais quand même
  "representative.role as representative_role",

  // annotations privées
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
    .leftJoin("fichier as fichier_espèces_impactées", {
      "fichier_espèces_impactées.id": "dossier.espèces_impactées",
    })
    .then((dossiers) => {
      for (const dossier of dossiers) {
        const id_fichier_espèces_impactées = dossier.espèces_impactées_id;
        if (id_fichier_espèces_impactées) {
          dossier.url_fichier_espèces_impactées = `/especes-impactees/${id_fichier_espèces_impactées}`;
        }
      }
      return dossiers;
    });
}

export async function getDossierComplet(
  dossierId: DossierComplet["id"],
  cap: CapDossier["cap"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DossierComplet | undefined> {
  let transaction: Knex.Transaction;

  if (databaseConnection.isTransaction) {
    //@ts-expect-error Knex est mal typé et ne comprend pas que databaseConnection est de type Knex.Transaction
    transaction = databaseConnection;
  } else {
    transaction = await databaseConnection.transaction({ readOnly: true });
  }

  const accessibleDossierId = await dossiersAccessibleViaCap(dossierId, cap, transaction);

  if (!accessibleDossierId.has(dossierId)) {
    if (!databaseConnection.isTransaction) {
      // transaction créée à la main, la libérer avant de throw
      await transaction.commit();
    }
    throw new TypeError(`Le dossier ${dossierId} n'est pas accessible via la cap ${cap}`);
  }

  const dossierP: Promise<
    DossierComplet & {
      espèces_impactées_id?: Fichier["id"] | null;
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
    .leftJoin("fichier as fichier_espèces_impactées", {
      "fichier_espèces_impactées.id": "dossier.espèces_impactées",
    })
    .where({ "arête_cap_dossier__groupe_instructeurs.cap_dossier": cap })
    .andWhere({ "dossier.id": dossierId })
    .first();

  const évènementsPhaseDossierP: Promise<ÉvènementPhaseDossier[]> = getÉvènementsPhaseDossier(
    dossierId,
    transaction,
  );

  const tousLesAvisExpertDossierP: Promise<AvisExpert[]> = getAvisExpertDossier(
    dossierId,
    transaction,
  );

  const descriptionsPiècesJointesPétitionnaireP: Promise<
    (Pick<Fichier, "id" | "nom" | "media_type"> & { taille: number })[]
  > = getDescriptionsPiècesJointesPétitionnaire(dossierId, transaction);

  const décisionsAdministrativesP: Promise<DécisionAdministrative[]> = getDécisionAdministratives(
    dossierId,
    transaction,
  );
  const decisionIds = (await décisionsAdministrativesP).map((d) => d.id);

  const prescriptionsP: Promise<Prescription[]> = getPrescriptions(decisionIds, transaction);
  const prescriptionIds = (await prescriptionsP).map((d) => d.id);

  const contrôlesP: Promise<Contrôle[]> = getContrôles(prescriptionIds, transaction);

  if (!databaseConnection.isTransaction) {
    // transaction locale à cette fonction
    // nous la refermons donc manuellement
    Promise.all([
      dossierP,
      évènementsPhaseDossierP,
      tousLesAvisExpertDossierP,
      descriptionsPiècesJointesPétitionnaireP,
      décisionsAdministrativesP,
      prescriptionsP,
      contrôlesP,
    ])
      .then(transaction.commit)
      .catch(transaction.rollback);
  }

  return Promise.all([
    dossierP,
    évènementsPhaseDossierP,
    tousLesAvisExpertDossierP,
    descriptionsPiècesJointesPétitionnaireP,
    décisionsAdministrativesP,
    prescriptionsP,
    contrôlesP,
  ]).then(
    ([
      dossier,
      évènementsPhaseDossier,
      tousLesAvisExpertDossier,
      descriptionsPiècesJointesPétitionnaire,
      décisionsAdministratives,
      prescriptions,
      contrôles,
    ]) => {
      dossier.demandeur_adresse =
        dossier.demandeur_personne_morale_adresse ||
        dossier.demandeur_personne_physique_address ||
        "";
      delete dossier.demandeur_personne_morale_adresse;

      dossier.évènementsPhase = évènementsPhaseDossier;

      dossier.avisExpert = tousLesAvisExpertDossier.map(
        ({ avis_fichier, saisine_fichier, ...avisExpert }) => ({
          ...avisExpert,
          avis_fichier_url: avis_fichier ? `/avis-expert/fichier/${avis_fichier}` : undefined,
          saisine_fichier_url: saisine_fichier
            ? `/avis-expert/fichier/${saisine_fichier}`
            : undefined,
        }),
      );

      dossier.piècesJointesPétitionnaires = descriptionsPiècesJointesPétitionnaire.map(
        ({ id, nom, media_type, taille }) => ({
          url: `/piece-jointe-petitionnaire/fichier/${id}`,
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

      const contrôlesParPrescriptionId: Map<Prescription["id"], Contrôle[]> = new Map();
      for (const c of contrôles) {
        const id = c.prescription;
        const contrôlesPourCetId = contrôlesParPrescriptionId.get(id) || [];
        contrôlesPourCetId.push(c);
        contrôlesParPrescriptionId.set(id, contrôlesPourCetId);
      }

      const prescriptionsParDécisionId: Map<DécisionAdministrative["id"], FrontEndPrescription[]> =
        new Map();
      for (const p of prescriptions) {
        const contrôles = contrôlesParPrescriptionId.get(p.id);
        // @ts-ignore p devient un FrontEndPrescription
        p.contrôles = contrôles;

        const id = p.décision_administrative;
        const prescrPourCetId = prescriptionsParDécisionId.get(id) || [];

        // @ts-ignore p est devenu un FrontEndPrescription
        prescrPourCetId.push(p);
        prescriptionsParDécisionId.set(id, prescrPourCetId);
      }

      if (décisionsAdministratives.length >= 1) {
        dossier.décisionsAdministratives = décisionsAdministratives.map(
          ({ id, numéro, type, date_signature, date_fin_obligations, fichier, dossier }) => ({
            id,
            numéro,
            type,
            date_signature,
            date_fin_obligations,
            prescriptions: prescriptionsParDécisionId.get(id),
            fichier_url: fichier ? `/decision-administrative/fichier/${fichier}` : undefined,
            dossier,
          }),
        );
      }

      return dossier;
    },
  );
}

const colonnesDossierRésumé: (keyof DossierRésumé)[] = [
  //@ts-expect-error pas exactement une keyof DossierRésumé, mais quand même
  "dossier.id as id",
  //"id_demarches_simplifiées",
  "number_demarches_simplifiées",
  "date_dépôt",
  //@ts-expect-error pas exactement une keyof DossierRésumé, mais quand même
  "dossier.nom as nom",
  "rattaché_au_régime_ae",
  "activité_principale",

  // localisation
  "départements",
  "communes",
  "régions",

  // prochaine action attendue
  "prochaine_action_attendue_par",

  // déposant
  //@ts-expect-error pas exactement une keyof DossierRésumé, mais quand même
  "déposant.nom as déposant_nom",
  //@ts-expect-error pas exactement une keyof DossierRésumé, mais quand même
  "déposant.prénoms as déposant_prénoms",

  // demandeur_personne_physique
  //@ts-expect-error pas exactement une keyof DossierRésumé, mais quand même
  "demandeur_personne_physique.nom as demandeur_personne_physique_nom",
  //@ts-expect-error pas exactement une keyof DossierRésumé, mais quand même
  "demandeur_personne_physique.prénoms as demandeur_personne_physique_prénoms",

  // demandeur_personne_morale
  //@ts-expect-error pas exactement une keyof DossierRésumé, mais quand même
  "demandeur_personne_morale.siret as demandeur_personne_morale_siret",
  //@ts-expect-error pas exactement une keyof DossierRésumé, mais quand même
  "demandeur_personne_morale.raison_sociale as demandeur_personne_morale_raison_sociale",

  "enjeu",

  "commentaire_libre",

  "historique_identifiant_demande_onagre",
];

export async function getDossiersRésumésByCap(
  cap: CapDossier["cap"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DossierRésumé[]> {
  let transaction: Knex.Transaction;

  if (databaseConnection.isTransaction) {
    //@ts-expect-error Knex est mal typé et ne comprend pas que databaseConnection est de type Knex.Transaction
    transaction = databaseConnection;
  } else {
    transaction = await databaseConnection.transaction({ readOnly: true });
  }

  const dossiersP: Promise<DossierRésumé[]> = transaction("dossier")
    .select(colonnesDossierRésumé)
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

  const évènementsPhaseDossierP = getDerniersÉvènementsPhaseDossiers(cap, transaction);

  const décisionsAdministrativesP = getDécisionsAdministratives(cap, transaction);

  const result = Promise.all([dossiersP, évènementsPhaseDossierP, décisionsAdministrativesP]).then(
    ([dossiers, évènementsPhaseDossier, décisionsAdministratives]) => {
      const évènementsPhaseDossierById: Map<Dossier["id"], ÉvènementPhaseDossier> = new Map();

      for (const évènementPhaseDossier of évènementsPhaseDossier) {
        évènementsPhaseDossierById.set(évènementPhaseDossier.dossier, évènementPhaseDossier);
      }

      for (const dossier of dossiers) {
        const évènementPhaseDossier = évènementsPhaseDossierById.get(dossier.id);

        if (évènementPhaseDossier) {
          dossier.phase = évènementPhaseDossier.phase;
          dossier.date_début_phase = évènementPhaseDossier.horodatage;
        } else {
          // dépôt du dossier
          dossier.phase = "Accompagnement amont";
          dossier.date_début_phase = dossier.date_dépôt;
        }
      }

      const décisionsAdministrativesById: Map<Dossier["id"], FrontEndDécisionAdministrative[]> =
        new Map();
      for (const décisionAdministrative of décisionsAdministratives) {
        const décisionsAdministrativesPourCetId =
          décisionsAdministrativesById.get(décisionAdministrative.dossier) || [];
        décisionsAdministrativesPourCetId.push(décisionAdministrative);
        décisionsAdministrativesById.set(
          décisionAdministrative.dossier,
          décisionsAdministrativesPourCetId,
        );
      }

      for (const dossier of dossiers) {
        const décisionAdministrative = décisionsAdministrativesById.get(dossier.id);

        if (décisionAdministrative) {
          dossier.décisionsAdministratives = décisionAdministrative;
        }
      }

      return dossiers;
    },
  );

  if (!databaseConnection.isTransaction) {
    // transaction locale à cette fonction
    // nous la refermons donc manuellement
    Promise.all([dossiersP, évènementsPhaseDossierP])
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
 * Récupère uniquement la phase actuelle (la plus récente) pour chaque dossier
 * La requête utilise une astuce à coup de distinctOn (spécifique à Postgresql) pour y arriver
 */
export async function getDerniersÉvènementsPhaseDossiers(
  cap_dossier: CapDossier["cap"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<ÉvènementPhaseDossier[]> {
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
      // DS créé des mauvais "traitement" qui ne sont pas des changements de phase
      // On peut les détecter avec 'DS_emailAgentTraitant IS NULL'
      // Si un évènement_phase_dossier n'a ni de 'cause_personne' ni de 'DS_emailAgentTraitant',
      // on ne veut pas le refléter côté interface
      this.whereNotNull("cause_personne").orWhereNotNull("DS_emailAgentTraitant");
    })
    .orderBy([
      { column: "dossier", order: "asc" },
      { column: "horodatage", order: "desc" },
    ]);
}

export async function getÉvènementsPhaseDossiers(
  cap_dossier: CapDossier["cap"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<ÉvènementPhaseDossier[]> {
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
      // DS créé des mauvais "traitement" qui ne sont pas des changements de phase
      // On peut les détecter avec 'DS_emailAgentTraitant IS NULL'
      // Si un évènement_phase_dossier n'a ni de 'cause_personne' ni de 'DS_emailAgentTraitant',
      // on ne veut pas le refléter côté interface
      this.whereNotNull("cause_personne").orWhereNotNull("DS_emailAgentTraitant");
    });
}

async function getÉvènementsPhaseDossier(
  idDossier: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<ÉvènementPhaseDossier[]> {
  return databaseConnection("évènement_phase_dossier")
    .select("*")
    .where({ dossier: idDossier })
    .andWhere(function () {
      // DS créé des mauvais "traitement" qui ne sont pas des changements de phase
      // On peut les détecter avec 'DS_emailAgentTraitant IS NULL'
      // Si un évènement_phase_dossier n'a ni de 'cause_personne' ni de 'DS_emailAgentTraitant',
      // on ne veut pas le refléter côté interface
      this.whereNotNull("cause_personne").orWhereNotNull("DS_emailAgentTraitant");
    })
    .orderBy("horodatage", "desc");
}

async function getAvisExpertDossier(
  idDossier: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<AvisExpert[]> {
  return databaseConnection("avis_expert").select("*").where({ dossier: idDossier });
}

async function getDescriptionsPiècesJointesPétitionnaire(
  idDossier: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<(Pick<Fichier, "id" | "nom" | "media_type"> & { taille: number })[]> {
  return databaseConnection("dossier")
    .select([
      "fichier.id as id",
      "fichier.nom as nom",
      "fichier.media_type as media_type",
      databaseConnection.raw("coalesce(length(fichier.contenu), file.taille)::integer as taille"),
    ])
    .leftJoin("arête_dossier__fichier_pièces_jointes_pétitionnaire", {
      "arête_dossier__fichier_pièces_jointes_pétitionnaire.dossier": "dossier.id",
    })
    .leftJoin("fichier", {
      "fichier.id": "arête_dossier__fichier_pièces_jointes_pétitionnaire.fichier",
    })
    .leftJoin("file", { "file.id": "fichier.file_id" })
    .where({ dossier: idDossier });
}

export function deleteDossierByDSNumber(numbers: number[]) {
  return directDatabaseConnection("dossier")
    .whereIn("number_demarches_simplifiées", numbers)
    .delete();
}

export function updateDossier(
  id: Dossier["id"],
  dossierParams: Partial<Dossier & { évènementsPhase: ÉvènementPhaseDossier[] }>,
  causePersonne: Personne["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  let phaseAjoutée = Promise.resolve();

  if (dossierParams.évènementsPhase) {
    for (const ev of dossierParams.évènementsPhase) {
      ev.cause_personne = causePersonne;
    }

    phaseAjoutée = databaseConnection("évènement_phase_dossier").insert(
      dossierParams.évènementsPhase,
    );

    delete dossierParams.évènementsPhase;
  }

  let dossierÀJour = Promise.resolve();

  if (Object.keys(dossierParams).length >= 1) {
    dossierÀJour = databaseConnection("dossier").where({ id }).update(dossierParams);
  }

  return Promise.all([phaseAjoutée, dossierÀJour]);
}

/**
 * Synchronise et retourne les personnes des dossiers à insérer.
 */
async function synchroniserEtRetournerPersonnesPourDossiersInsérer(
  dossiersPourInsert: DossierPourInsert[],
  databaseConnection: Knex.Transaction | Knex,
) {
  let personnes: Personne[] = [];

  //@ts-ignore
  const personnesQuiSuiventDossiers: Pick<Personne, "email" | "nom" | "prénoms">[] =
    dossiersPourInsert
      .flatMap((dossier) => dossier.personnes_qui_suivent)
      .filter((x) => x != null)
      // On ne sélectionne que les propriétés que l'on veut garder (pas code_accès)
      .map(({ email, nom, prénoms }) => ({
        email: email ? normalisationEmail(email) : null,
        nom,
        prénoms,
      }));

  if (personnesQuiSuiventDossiers.length >= 1) {
    await databaseConnection("personne")
      .insert(personnesQuiSuiventDossiers)
      .onConflict(["email"])
      .ignore();

    const emails = personnesQuiSuiventDossiers.map((p) => p?.email).filter((x) => x != null);

    personnes = await databaseConnection("personne").select("id", "email").whereIn("email", emails);
  }
  return personnes;
}
