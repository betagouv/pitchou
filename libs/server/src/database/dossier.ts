import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { getOtherAttachmentsForDossier } from "./other_attachment.ts";
import { getDecisionsAdministratives } from "./decision_administrative.ts";
import { getPresenceFichiersAvisExpertByCap } from "./avis_expert.ts";
import { getPrescriptions } from "./prescription.ts";
import { getControles } from "./controle.ts";
import { normalizeEmail } from "@pitchou/common/stringManipulation.ts";

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
  DossierForInsert,
  DossierForUpdate,
} from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type EdgePersonneFollowsDossier from "@pitchou/types/database/public/EdgePersonneFollowsDossier.ts";
import type {
  DossierFull,
  DossierSummary,
  FrontEndDecisionAdministrative,
  FrontEndFichier,
  FrontEndPrescription,
} from "@pitchou/types/API_Pitchou.ts";
import type { PartialBy, PickNonNullable } from "@pitchou/types/tools.d.ts";
import type { OtherAttachmentWithFileDescription } from "./other_attachment.ts";
import type File from "@pitchou/types/database/public/File.ts";

/**
 * Fetch the Pitchou ids from the DS ids (not the numéro)
 *
 * PPP: it's a bit weird to use the DS ids, we could use the numéros
 */
export function getDossierIdsFromDS_Ids(
  DS_ids: Dossier["demarche_numerique_id"][],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<
  PickNonNullable<Dossier, "id" | "demarche_numerique_id" | "demarche_numerique_number">[]
> {
  return databaseConnection("dossier")
    .select(["id", "demarche_numerique_id", "demarche_numerique_number"])
    .whereIn("demarche_numerique_id", DS_ids);
}

export async function dumpDossierMessages(
  idToMessages: Map<Dossier["id"], API_DS_SCHEMA.Message[]>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  const messages: Partial<Message>[] = [];

  for (const [dossierId, apiMessages] of idToMessages) {
    for (const { id, body, createdAt, email } of apiMessages) {
      messages.push({
        content: body,
        date: new Date(createdAt),
        sender_email: email,
        demarche_numerique_id: id,
        dossier: dossierId,
      });
    }
  }

  return databaseConnection("message").insert(messages).onConflict("demarche_numerique_id").merge();
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
    .select(["content", "date", "sender_email"])
    .where({ dossier: dossierId });
}

const varcharKeys: (keyof Pick<Dossier, "name" | "ddep_required">)[] = ["name", "ddep_required"];

type DecisionAdministrativeToInsert = NonNullable<
  DossierForInsert["decision_administrative"]
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

  const decisionsInDB = await databaseConnection("decision_administrative")
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
  dossiersForInsert: DossierForInsert[],
  dossiersForUpdate: DossierForUpdate[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  for (const { dossier: d } of [...dossiersForInsert, ...dossiersForUpdate]) {
    for (const k of varcharKeys) {
      if (typeof d[k] === "string" && d[k].length >= 255) {
        console.warn(
          "Attontion !! Dossier DS numéro",
          d.demarche_numerique_number,
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

  const personneFollowsDossierEdges: EdgePersonneFollowsDossier[] = [];

  let avisExpertDossier: PartialBy<AvisExpertInitializer, "dossier">[] = [];

  if (dossiersForUpdate.length >= 1) {
    updatePromises = dossiersForUpdate.map(({ dossier: dossierToUpdate }) => {
      return databaseConnection("dossier")
        .where("demarche_numerique_number", dossierToUpdate.demarche_numerique_number)
        .update(dossierToUpdate)
        .returning(["id", "demarche_numerique_number", "demarche_numerique_id"]);
    });
  }

  let synchronizePersonnesAndRelationsSuiviForInsertedDossiersP: Promise<any> = Promise.resolve([]);

  if (dossiersForInsert.length >= 1) {
    let insertedDossierIds: { id: DossierId }[] = await databaseConnection("dossier")
      .insert(dossiersForInsert.map((tables) => tables.dossier))
      .returning(["id"]);

    const allPersonnesWhoFollow = await synchronizeAndReturnPersonnesForDossiersToInsert(
      dossiersForInsert,
      databaseConnection,
    );

    if (allPersonnesWhoFollow.length >= 1) {
      insertedDossierIds.forEach((insertedDossierId, index) => {
        const { followers, evenement_phase_dossier } = dossiersForInsert[index];
        const emailsWhoFollow = new Set(followers?.map((p) => p.email));

        //Warning, here there is a risk of performance problems with the filter
        const personnesWhoFollowThisDossier = allPersonnesWhoFollow.filter(
          (p) => p.email && emailsWhoFollow.has(p.email),
        );

        personnesWhoFollowThisDossier.forEach((personne) => {
          personneFollowsDossierEdges.push({
            dossier: insertedDossierId.id,
            personne: personne.id,
          });
        });

        if (personnesWhoFollowThisDossier.length >= 1) {
          evenement_phase_dossier.forEach((ev) => {
            if (!ev.caused_by_personne) {
              // In the front-end, we want to display the phase events with a non-null caused_by_personne.
              ev.caused_by_personne = personnesWhoFollowThisDossier[0].id;
            }
          });
        }
      });
    }

    avisExpertDossier = dossiersForInsert
      .map((tables) => tables.avis_expert)
      .filter((x) => x !== undefined)
      .flat();

    // Add the new Dossier['id'] to the data that needs it
    insertedDossierIds.forEach((insertedDossierId, index) => {
      // assumes that postgres returns the ids in the same order as the array passed to `.insert`
      const { evenement_phase_dossier, avis_expert, decision_administrative } =
        dossiersForInsert[index];

      if (Array.isArray(evenement_phase_dossier) && evenement_phase_dossier.length >= 1) {
        evenement_phase_dossier.forEach((ev) => (ev.dossier = insertedDossierId.id));
      }
      if (Array.isArray(avis_expert) && avis_expert.length >= 1) {
        avis_expert.forEach((ae) => (ae.dossier = insertedDossierId.id));
      }
      if (Array.isArray(decision_administrative) && decision_administrative.length >= 1) {
        decision_administrative.forEach((da) => (da.dossier = insertedDossierId.id));
      }
    });
  }

  const allDossiers = [...dossiersForUpdate, ...dossiersForInsert];

  const evenementsPhaseDossier = allDossiers
    .map((tables) => tables.evenement_phase_dossier)
    .filter((x) => x !== undefined)
    .flat();

  const decisionAdministrativeDossier = allDossiers
    .map((tables) => tables.decision_administrative)
    .filter((x) => x !== undefined)
    .flat();

  const decisionsAdministrativesToInsert = await getDecisionsAdministrativesNotInDB(
    decisionAdministrativeDossier,
    databaseConnection,
  );

  const databaseOperations = [
    evenementsPhaseDossier.length > 0
      ? databaseConnection("evenement_phase_dossier")
          .insert(evenementsPhaseDossier)
          .onConflict(["dossier", "phase", "timestamp"])
          .merge()
      : Promise.resolve([]),

    avisExpertDossier.length > 0
      ? databaseConnection("avis_expert").insert(avisExpertDossier)
      : Promise.resolve([]),

    decisionsAdministrativesToInsert.length > 0
      ? databaseConnection("decision_administrative").insert(decisionsAdministrativesToInsert)
      : Promise.resolve([]),

    personneFollowsDossierEdges.length > 0
      ? databaseConnection("edge_personne_follows_dossier")
          .insert(personneFollowsDossierEdges)
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
    .select(["id", "demarche_numerique_number"])
    .whereIn(
      "demarche_numerique_number",
      dossierDS.map((d: { number: string }) => d.number),
    )
    .then((dossiers) => {
      const dossierNumberDSToId = new Map();
      for (const { id, demarche_numerique_number } of dossiers) {
        dossierNumberDSToId.set(demarche_numerique_number, id);
      }
      return dossierNumberDSToId;
    });

  const groupeInstructeursLabelToIdP = databaseConnection("groupe_instructeurs")
    .select(["id", "name"])
    .where({ demarche_number: demarcheNumber })
    .then((groupesInstructeurs) => {
      const groupeInstructeursLabelToId = new Map();
      for (const { id, name } of groupesInstructeurs) {
        groupeInstructeursLabelToId.set(name, id);
      }
      return groupeInstructeursLabelToId;
    });

  const dossierNumberDSToId = await dossierNumberDSToIdP;
  const groupeInstructeursLabelToId = await groupeInstructeursLabelToIdP;

  const groupeInstructeursDossierEdges = dossierDS.map(
    // @ts-ignore
    ({ number, groupeInstructeur: { label } }) => {
      const dossierId = dossierNumberDSToId.get(String(number));
      const groupeInstructeursId = groupeInstructeursLabelToId.get(label);

      if (!groupeInstructeursId) {
        throw new Error(`groupe_instructeursId manquant pour groupe ${label}`);
      }

      return { dossier: dossierId, groupe_instructeurs: groupeInstructeursId };
    },
  );

  return databaseConnection("edge_groupe_instructeurs__dossier")
    .insert(groupeInstructeursDossierEdges)
    .onConflict("dossier")
    .merge(["groupe_instructeurs"]);
}

const dossierFullColumns: (keyof DossierFull)[] = [
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "dossier.id as id",
  //"demarche_numerique_id",
  "demarche_numerique_number",
  "demarche_number",
  "depot_date",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "dossier.name as name",
  "description",

  "intervention_start_date",
  "intervention_end_date",
  "intervention_duration",

  "no_other_satisfactory_solution_justification",
  "motif_derogation",
  "motif_derogation_justification",

  //@ts-expect-error not exactly a keyof DossierFull, but still
  "file_especes_impactees.id as especes_impactees_id",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "file_especes_impactees.name as especes_impactees_name",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "file_especes_impactees.media_type as especes_impactees_media_type",
  "linked_to_ae_regime",
  "main_activite",

  // localisation
  "departments",
  "communes",
  "regions",
  "projet_map",

  // next expected action
  "next_action_expected_from",

  // demandeur identity (Démarche Numérique identity block)
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "identite_demandeur.last_name as deposant_last_name",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "identite_demandeur.first_names as deposant_first_names",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "identite_demandeur.email as deposant_email",

  // mandataire identity (only when the dossier was submitted by a third party)
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "identite_mandataire.last_name as mandataire_last_name",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "identite_mandataire.first_names as mandataire_first_names",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "identite_mandataire.email as mandataire_email",

  // demandeur_personne_physique
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "demandeur_personne_physique.last_name as demandeur_personne_physique_last_name",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "demandeur_personne_physique.first_names as demandeur_personne_physique_first_names",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "demandeur_personne_physique.email as demandeur_personne_physique_email",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "demandeur_personne_physique.address as demandeur_personne_physique_address",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "demandeur_personne_physique.phone as demandeur_personne_physique_phone",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "demandeur_personne_physique.role as demandeur_personne_physique_role",

  // demandeur_personne_morale
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "demandeur_personne_morale.siret as demandeur_personne_morale_siret",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "demandeur_personne_morale.legal_name as demandeur_personne_morale_legal_name",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "demandeur_personne_morale.address as demandeur_personne_morale_address",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "demandeur_personne_morale.siren as demandeur_personne_morale_siren",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "demandeur_personne_morale.legal_form as demandeur_personne_morale_legal_form",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "demandeur_personne_morale.naf_code as demandeur_personne_morale_naf_code",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "demandeur_personne_morale.naf_label as demandeur_personne_morale_naf_label",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "demandeur_personne_morale.creation_date as demandeur_personne_morale_creation_date",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "demandeur_personne_morale.admin_status as demandeur_personne_morale_admin_status",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "demandeur_personne_morale.headcount as demandeur_personne_morale_headcount",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "demandeur_personne_morale.share_capital as demandeur_personne_morale_share_capital",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "demandeur_personne_morale.insee_code as demandeur_personne_morale_insee_code",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "demandeur_personne_morale.postal_code as demandeur_personne_morale_postal_code",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "demandeur_personne_morale.department as demandeur_personne_morale_department",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "demandeur_personne_morale.region as demandeur_personne_morale_region",

  // representant (contact person within the personne morale)
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "identite_representant.last_name as representative_last_name",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "identite_representant.first_names as representative_first_names",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "identite_representant.email as representative_email",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "identite_representant.phone as representative_phone",
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "identite_representant.role as representative_role",

  // private annotations
  "ddep_required",

  "scientifique_demande_type",
  "scientifique_previous_assessment",
  "scientifique_demande_purposes",
  "scientifique_suivi_protocol_description",
  "scientifique_capture_mode",
  "scientifique_light_source_conditions",
  "scientifique_marking_conditions",
  "scientifique_transport_conditions",
  "scientifique_intervention_perimeter",
  "scientifique_intervenants",
  "scientifique_other_intervenants_details",

  "enjeu",
  "free_comment",
  "onagre_demande_identifier",

  "public_consultation_start_date",
  "public_consultation_end_date",

  "mesures_erc_planned",
  "er_mesures_sufficient",

  "dossier_oiseau_simple_compensated_nids_count",
  "dossier_oiseau_simple_destroyed_nids_count",

  // Qualified because identite_dossier (joined for the identities) also has a "type" column.
  //@ts-expect-error not exactly a keyof DossierFull, but still
  "dossier.type as type",

  "ecological_inventory_completed",
  "especes_present_in_influence_area",
  "risk_despite_erc_mesures",
  "commissioning_date",
];

export function listAllDossiersFull(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DossierFull[]> {
  return databaseConnection("dossier")
    .select(dossierFullColumns)
    .leftJoin("identite_dossier as identite_demandeur", function () {
      this.on("identite_demandeur.dossier", "dossier.id").andOnVal(
        "identite_demandeur.type",
        "demandeur",
      );
    })
    .leftJoin("identite_dossier as identite_mandataire", function () {
      this.on("identite_mandataire.dossier", "dossier.id").andOnVal(
        "identite_mandataire.type",
        "mandataire",
      );
    })
    .leftJoin("identite_dossier as identite_representant", function () {
      this.on("identite_representant.dossier", "dossier.id").andOnVal(
        "identite_representant.type",
        "representant",
      );
    })
    .leftJoin("personne as demandeur_personne_physique", {
      "demandeur_personne_physique.id": "dossier.demandeur_personne_physique",
    })
    .leftJoin("entreprise as demandeur_personne_morale", {
      "demandeur_personne_morale.siret": "dossier.demandeur_personne_morale",
    })
    .leftJoin("file as file_especes_impactees", {
      "file_especes_impactees.id": "dossier.especes_impactees",
    })
    .then((dossiers) => {
      for (const dossier of dossiers) {
        const especesImpacteesFileId = dossier.especes_impactees_id;
        if (especesImpacteesFileId) {
          dossier.url_fichier_especes_impactees = `/especes-impactees/${especesImpacteesFileId}`;
        }
      }
      return dossiers;
    });
}

type AvisExpertWithFichierDescriptions = AvisExpert & {
  avis_file_name: File["name"];
  avis_fichier_media_type: File["media_type"];
  avis_file_size: number | null;
  saisine_file_name: File["name"];
  saisine_fichier_media_type: File["media_type"];
  saisine_file_size: number | null;
};

type DecisionAdministrativeWithFichierDescription = DecisionAdministrative & {
  file_name: File["name"];
  file_media_type: File["media_type"];
  file_size: number | null;
};

function describeFichier(
  id: File["id"] | null | undefined,
  name: File["name"],
  media_type: File["media_type"],
  size: number | null,
  route: string,
): FrontEndFichier | undefined {
  if (!id) {
    return undefined;
  }

  return {
    url: `${route}/${id}`,
    name,
    media_type,
    size,
  };
}

export async function getDossierFull(
  dossierId: DossierFull["id"],
  cap: CapDossier["cap"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DossierFull | undefined> {
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
    DossierFull & {
      especes_impactees_id?: FileId | null;
      especes_impactees_media_type?: string;
      especes_impactees_name?: string;
      demandeur_personne_morale_address?: string;
    }
  > = transaction("dossier")
    .select(dossierFullColumns)
    .join("edge_groupe_instructeurs__dossier", {
      "edge_groupe_instructeurs__dossier.dossier": "dossier.id",
    })
    .join("edge_cap_dossier__groupe_instructeurs", {
      "edge_cap_dossier__groupe_instructeurs.groupe_instructeurs":
        "edge_groupe_instructeurs__dossier.groupe_instructeurs",
    })
    .leftJoin("identite_dossier as identite_demandeur", function () {
      this.on("identite_demandeur.dossier", "dossier.id").andOnVal(
        "identite_demandeur.type",
        "demandeur",
      );
    })
    .leftJoin("identite_dossier as identite_mandataire", function () {
      this.on("identite_mandataire.dossier", "dossier.id").andOnVal(
        "identite_mandataire.type",
        "mandataire",
      );
    })
    .leftJoin("identite_dossier as identite_representant", function () {
      this.on("identite_representant.dossier", "dossier.id").andOnVal(
        "identite_representant.type",
        "representant",
      );
    })
    .leftJoin("personne as demandeur_personne_physique", {
      "demandeur_personne_physique.id": "dossier.demandeur_personne_physique",
    })
    .leftJoin("entreprise as demandeur_personne_morale", {
      "demandeur_personne_morale.siret": "dossier.demandeur_personne_morale",
    })
    .leftJoin("file as file_especes_impactees", {
      "file_especes_impactees.id": "dossier.especes_impactees",
    })
    .where({ "edge_cap_dossier__groupe_instructeurs.cap_dossier": cap })
    .andWhere({ "dossier.id": dossierId })
    .first();

  const evenementsPhaseDossierP: Promise<EvenementPhaseDossier[]> = getEvenementsPhaseDossier(
    dossierId,
    transaction,
  );

  const allAvisExpertDossierP: Promise<AvisExpertWithFichierDescriptions[]> = getAvisExpertDossier(
    dossierId,
    transaction,
  );

  const descriptionsPiecesJointesPetitionnaireP: Promise<
    (Pick<File, "demarche_numerique_created_at" | "id" | "name" | "media_type"> & {
      size: number;
    })[]
  > = getDescriptionsPiecesJointesPetitionnaire(dossierId, transaction);

  const decisionsAdministrativesP: Promise<DecisionAdministrativeWithFichierDescription[]> =
    getDecisionAdministrativesDossier(dossierId, transaction);
  const otherAttachmentsPromise: Promise<OtherAttachmentWithFileDescription[]> =
    getOtherAttachmentsForDossier(dossierId, transaction);
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
      otherAttachmentsPromise,
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
    otherAttachmentsPromise,
    prescriptionsP,
    controlesP,
  ]).then(
    ([
      dossier,
      evenementsPhaseDossier,
      allAvisExpertDossier,
      descriptionsPiecesJointesPetitionnaire,
      decisionsAdministratives,
      otherAttachments,
      prescriptions,
      controles,
    ]) => {
      dossier.demandeur_address =
        dossier.demandeur_personne_morale_address ||
        dossier.demandeur_personne_physique_address ||
        "";
      delete dossier.demandeur_personne_morale_address;

      dossier.evenementsPhase = evenementsPhaseDossier;

      dossier.avisExpert = allAvisExpertDossier.map(
        ({
          avis_fichier,
          avis_file_name,
          avis_fichier_media_type,
          avis_file_size,
          saisine_fichier,
          saisine_file_name,
          saisine_fichier_media_type,
          saisine_file_size,
          ...avisExpert
        }) => {
          const avisFichierDescription = describeFichier(
            avis_fichier,
            avis_file_name,
            avis_fichier_media_type,
            avis_file_size,
            "/avis-expert/fichier",
          );
          const saisineFichierDescription = describeFichier(
            saisine_fichier,
            saisine_file_name,
            saisine_fichier_media_type,
            saisine_file_size,
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

      dossier.piecesJointesPetitionnaires = descriptionsPiecesJointesPetitionnaire.map(
        ({ id, demarche_numerique_created_at, name, media_type, size }) => ({
          url: `/piece-jointe-petitionnaire/fichier/${id}`,
          demarche_numerique_created_at,
          name,
          media_type,
          size,
        }),
      );

      if (
        dossier.especes_impactees_id &&
        dossier.especes_impactees_media_type &&
        dossier.especes_impactees_name
      ) {
        dossier.especesImpactees = {
          url: `/especes-impactees/${dossier.especes_impactees_id}`,
          media_type: dossier.especes_impactees_media_type,
          name: dossier.especes_impactees_name,
        };
      }

      delete dossier.especes_impactees_id;
      delete dossier.especes_impactees_media_type;
      delete dossier.especes_impactees_name;

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
        p.controles = controles;

        const id = p.decision_administrative;
        const prescrForThisId = prescriptionsByDecisionId.get(id) || [];

        // @ts-ignore p est devenu un FrontEndPrescription
        prescrForThisId.push(p);
        prescriptionsByDecisionId.set(id, prescrForThisId);
      }

      if (decisionsAdministratives.length >= 1) {
        dossier.decisionsAdministratives = decisionsAdministratives.map(
          ({
            id,
            number,
            type,
            signature_date,
            obligations_end_date,
            fichier,
            file_name,
            file_media_type,
            file_size,
            dossier,
          }) => {
            const fichierDescription = describeFichier(
              fichier,
              file_name,
              file_media_type,
              file_size,
              "/decision-administrative/fichier",
            );

            return {
              id,
              number,
              type,
              signature_date,
              obligations_end_date,
              prescriptions: prescriptionsByDecisionId.get(id),
              fichier_url: fichierDescription?.url,
              fichier_description: fichierDescription,
              dossier,
            };
          },
        );
      }

      dossier.otherAttachments = otherAttachments.map(
        ({ fichier, file_name, file_media_type, file_size, ...attachment }) => {
          const fileDescription = describeFichier(
            fichier,
            file_name,
            file_media_type,
            file_size,
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

const dossierSummaryColumns: (keyof DossierSummary)[] = [
  //@ts-expect-error not exactly a keyof DossierSummary, but still
  "dossier.id as id",
  //"demarche_numerique_id",
  "demarche_numerique_number",
  "depot_date",
  //@ts-expect-error not exactly a keyof DossierSummary, but still
  "dossier.name as name",
  "linked_to_ae_regime",
  "main_activite",

  // localisation
  "departments",
  "communes",
  "regions",

  // next expected action
  "next_action_expected_from",

  // demandeur identity (Démarche Numérique identity block)
  //@ts-expect-error not exactly a keyof DossierSummary, but still
  "identite_demandeur.last_name as deposant_last_name",
  //@ts-expect-error not exactly a keyof DossierSummary, but still
  "identite_demandeur.first_names as deposant_first_names",

  // demandeur_personne_physique
  //@ts-expect-error not exactly a keyof DossierSummary, but still
  "demandeur_personne_physique.last_name as demandeur_personne_physique_last_name",
  //@ts-expect-error not exactly a keyof DossierSummary, but still
  "demandeur_personne_physique.first_names as demandeur_personne_physique_first_names",

  // demandeur_personne_morale
  //@ts-expect-error not exactly a keyof DossierSummary, but still
  "demandeur_personne_morale.siret as demandeur_personne_morale_siret",
  //@ts-expect-error not exactly a keyof DossierSummary, but still
  "demandeur_personne_morale.legal_name as demandeur_personne_morale_legal_name",

  "enjeu",

  "free_comment",

  "onagre_demande_identifier",
];

export async function getDossiersSummariesByCap(
  cap: CapDossier["cap"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DossierSummary[]> {
  let transaction: Knex.Transaction;

  if (databaseConnection.isTransaction) {
    //@ts-expect-error Knex is badly typed and does not understand that databaseConnection is of type Knex.Transaction
    transaction = databaseConnection;
  } else {
    transaction = await databaseConnection.transaction({ readOnly: true });
  }

  const dossiersP: Promise<DossierSummary[]> = transaction("dossier")
    .select(dossierSummaryColumns)
    // Presence of the especes impactees file, without transferring the file itself.
    .select(
      transaction.raw('dossier."especes_impactees" is not null as "especesImpacteesRenseignees"'),
    )
    .join("edge_groupe_instructeurs__dossier", {
      "edge_groupe_instructeurs__dossier.dossier": "dossier.id",
    })
    .join("edge_cap_dossier__groupe_instructeurs", {
      "edge_cap_dossier__groupe_instructeurs.groupe_instructeurs":
        "edge_groupe_instructeurs__dossier.groupe_instructeurs",
    })
    .leftJoin("identite_dossier as identite_demandeur", function () {
      this.on("identite_demandeur.dossier", "dossier.id").andOnVal(
        "identite_demandeur.type",
        "demandeur",
      );
    })
    .leftJoin("personne as demandeur_personne_physique", {
      "demandeur_personne_physique.id": "dossier.demandeur_personne_physique",
    })
    .leftJoin("entreprise as demandeur_personne_morale", {
      "demandeur_personne_morale.siret": "dossier.demandeur_personne_morale",
    })
    .where({ "edge_cap_dossier__groupe_instructeurs.cap_dossier": cap });

  const evenementsPhaseDossierP = getLatestEvenementsPhaseDossiers(cap, transaction);

  const decisionsAdministrativesP = getDecisionsAdministratives(cap, transaction);

  const presenceFichiersAvisExpertP = getPresenceFichiersAvisExpertByCap(cap, transaction);

  const result = Promise.all([
    dossiersP,
    evenementsPhaseDossierP,
    decisionsAdministrativesP,
    presenceFichiersAvisExpertP,
  ]).then(
    ([dossiers, evenementsPhaseDossier, decisionsAdministratives, presenceFichiersAvisExpert]) => {
      const evenementsPhaseDossierById: Map<Dossier["id"], EvenementPhaseDossier> = new Map();

      for (const evenementPhaseDossier of evenementsPhaseDossier) {
        evenementsPhaseDossierById.set(evenementPhaseDossier.dossier, evenementPhaseDossier);
      }

      for (const dossier of dossiers) {
        const evenementPhaseDossier = evenementsPhaseDossierById.get(dossier.id);

        if (evenementPhaseDossier) {
          dossier.phase = evenementPhaseDossier.phase;
          dossier.phase_start_date = evenementPhaseDossier.timestamp;
        } else {
          // dossier submission
          dossier.phase = "Accompagnement amont";
          dossier.phase_start_date = dossier.depot_date;
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
          dossier.decisionsAdministratives = decisionAdministrative;
        }
      }

      const avisExpertsById = new Map<Dossier["id"], DossierSummary["avisExperts"]>();
      for (const {
        dossier,
        saisineFichierPresent,
        avisFichierPresent,
      } of presenceFichiersAvisExpert) {
        const avisExperts = avisExpertsById.get(dossier) ?? [];
        avisExperts.push({ saisineFichierPresent, avisFichierPresent });
        avisExpertsById.set(dossier, avisExperts);
      }

      for (const dossier of dossiers) {
        dossier.avisExperts = avisExpertsById.get(dossier.id) ?? [];
      }

      return dossiers;
    },
  );

  if (!databaseConnection.isTransaction) {
    // transaction local to this function
    // so we close it manually
    Promise.all([
      dossiersP,
      evenementsPhaseDossierP,
      decisionsAdministrativesP,
      presenceFichiersAvisExpertP,
    ])
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

  const ret = databaseConnection("edge_cap_dossier__groupe_instructeurs")
    .select(["dossier.id as id"])
    .leftJoin("edge_groupe_instructeurs__dossier", {
      "edge_groupe_instructeurs__dossier.groupe_instructeurs":
        "edge_cap_dossier__groupe_instructeurs.groupe_instructeurs",
    })
    .leftJoin("dossier", { "dossier.id": "edge_groupe_instructeurs__dossier.dossier" })
    .whereIn("dossier.id", dossierIds)
    .andWhere({ "edge_cap_dossier__groupe_instructeurs.cap_dossier": cap })
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
  return databaseConnection("evenement_phase_dossier")
    .select(["evenement_phase_dossier.dossier as dossier", "phase", "timestamp"])
    .join("edge_groupe_instructeurs__dossier", {
      "edge_groupe_instructeurs__dossier.dossier": "evenement_phase_dossier.dossier",
    })
    .join("edge_cap_dossier__groupe_instructeurs", {
      "edge_cap_dossier__groupe_instructeurs.groupe_instructeurs":
        "edge_groupe_instructeurs__dossier.groupe_instructeurs",
    })
    .where({ "edge_cap_dossier__groupe_instructeurs.cap_dossier": cap_dossier })
    .distinctOn("dossier")
    .andWhere(function () {
      // DS creates bad "traitement" that are not phase changes
      // We can detect them with 'demarche_numerique_agent_email IS NULL'
      // If an evenement_phase_dossier has neither a 'caused_by_personne' nor a 'demarche_numerique_agent_email',
      // we don't want to reflect it on the interface side
      this.whereNotNull("caused_by_personne").orWhereNotNull("demarche_numerique_agent_email");
    })
    .orderBy([
      { column: "dossier", order: "asc" },
      { column: "timestamp", order: "desc" },
    ]);
}

export async function getEvenementsPhaseDossiers(
  cap_dossier: CapDossier["cap"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<EvenementPhaseDossier[]> {
  return databaseConnection("evenement_phase_dossier")
    .select(["evenement_phase_dossier.dossier as dossier", "phase", "timestamp"])
    .join("edge_groupe_instructeurs__dossier", {
      "edge_groupe_instructeurs__dossier.dossier": "evenement_phase_dossier.dossier",
    })
    .join("edge_cap_dossier__groupe_instructeurs", {
      "edge_cap_dossier__groupe_instructeurs.groupe_instructeurs":
        "edge_groupe_instructeurs__dossier.groupe_instructeurs",
    })
    .where({ "edge_cap_dossier__groupe_instructeurs.cap_dossier": cap_dossier })
    .andWhere(function () {
      // DS creates bad "traitement" that are not phase changes
      // We can detect them with 'demarche_numerique_agent_email IS NULL'
      // If an evenement_phase_dossier has neither a 'caused_by_personne' nor a 'demarche_numerique_agent_email',
      // we don't want to reflect it on the interface side
      this.whereNotNull("caused_by_personne").orWhereNotNull("demarche_numerique_agent_email");
    });
}

async function getEvenementsPhaseDossier(
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<EvenementPhaseDossier[]> {
  return databaseConnection("evenement_phase_dossier")
    .select("*")
    .where({ dossier: dossierId })
    .andWhere(function () {
      // DS creates bad "traitement" that are not phase changes
      // We can detect them with 'demarche_numerique_agent_email IS NULL'
      // If an evenement_phase_dossier has neither a 'caused_by_personne' nor a 'demarche_numerique_agent_email',
      // we don't want to reflect it on the interface side
      this.whereNotNull("caused_by_personne").orWhereNotNull("demarche_numerique_agent_email");
    })
    .orderBy("timestamp", "desc");
}

async function getAvisExpertDossier(
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<AvisExpertWithFichierDescriptions[]> {
  return databaseConnection("avis_expert")
    .select([
      "avis_expert.*",
      "file_avis.name as avis_file_name",
      "file_avis.media_type as avis_fichier_media_type",
      databaseConnection.raw("file_avis.size::integer as avis_file_size"),
      "file_saisine.name as saisine_file_name",
      "file_saisine.media_type as saisine_fichier_media_type",
      databaseConnection.raw("file_saisine.size::integer as saisine_file_size"),
    ])
    .leftJoin("file as file_avis", { "file_avis.id": "avis_expert.avis_fichier" })
    .leftJoin("file as file_saisine", { "file_saisine.id": "avis_expert.saisine_fichier" })
    .where({ dossier: dossierId });
}

async function getDecisionAdministrativesDossier(
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DecisionAdministrativeWithFichierDescription[]> {
  return databaseConnection("decision_administrative")
    .select([
      "decision_administrative.*",
      "file_decision.name as file_name",
      "file_decision.media_type as file_media_type",
      databaseConnection.raw("file_decision.size::integer as file_size"),
    ])
    .leftJoin("file as file_decision", { "file_decision.id": "decision_administrative.fichier" })
    .where({ dossier: dossierId });
}

async function getDescriptionsPiecesJointesPetitionnaire(
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<
  (Pick<File, "demarche_numerique_created_at" | "id" | "name" | "media_type"> & {
    size: number;
  })[]
> {
  return databaseConnection("dossier")
    .select([
      "file.id as id",
      "file.demarche_numerique_created_at as demarche_numerique_created_at",
      "file.name as name",
      "file.media_type as media_type",
      databaseConnection.raw("file.size::integer as size"),
    ])
    .leftJoin("edge_dossier__fichier_pieces_jointes_petitionnaire", {
      "edge_dossier__fichier_pieces_jointes_petitionnaire.dossier": "dossier.id",
    })
    .leftJoin("file", {
      "file.id": "edge_dossier__fichier_pieces_jointes_petitionnaire.fichier",
    })
    .where({ dossier: dossierId });
}

export function deleteDossierByDSNumber(numbers: number[]) {
  return directDatabaseConnection("dossier").whereIn("demarche_numerique_number", numbers).delete();
}

export async function updateDossier(
  id: Dossier["id"],
  dossierParams: Partial<Dossier & { evenementsPhase: EvenementPhaseDossier[] }>,
  causePersonne: Personne["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  const { evenementsPhase, ...dossierColumns } = dossierParams;
  const phaseAdded = evenementsPhase
    ? await databaseConnection("evenement_phase_dossier").insert(
        evenementsPhase.map((event) => ({ ...event, caused_by_personne: causePersonne })),
      )
    : undefined;
  const updatedDossier =
    Object.keys(dossierColumns).length >= 1
      ? await databaseConnection("dossier").where({ id }).update(dossierColumns)
      : undefined;

  return [phaseAdded, updatedDossier];
}

/**
 * Synchronizes and returns the personnes of the dossiers to insert.
 */
async function synchronizeAndReturnPersonnesForDossiersToInsert(
  dossiersForInsert: DossierForInsert[],
  databaseConnection: Knex.Transaction | Knex,
) {
  let personnes: Personne[] = [];

  //@ts-ignore
  const personnesWhoFollowDossiers: Pick<Personne, "email" | "last_name" | "first_names">[] =
    dossiersForInsert
      .flatMap((dossier) => dossier.followers)
      .filter((x) => x != null)
      // We only select the properties we want to keep (not access_code)
      .map(({ email, last_name, first_names }) => ({
        email: email ? normalizeEmail(email) : null,
        last_name,
        first_names,
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
