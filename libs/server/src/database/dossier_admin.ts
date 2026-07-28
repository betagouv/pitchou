import type { Knex } from "knex";

import { directDatabaseConnection, dumpEntreprises } from "../database.ts";
import { updateDossier } from "./dossier.ts";
import { deleteFichiersWithoutOtherReferences } from "./fichier.ts";
import { normalizeEmail } from "@pitchou/common/stringManipulation.ts";

import type { DossierPhase } from "@pitchou/types/API_Pitchou.ts";
import type {
  default as Dossier,
  DossierId,
  DossierMutator,
} from "@pitchou/types/database/public/Dossier.ts";
import type { PersonneId } from "@pitchou/types/database/public/Personne.ts";
import type {
  default as Entreprise,
  EntrepriseInitializer,
} from "@pitchou/types/database/public/Entreprise.ts";
import type { GroupeInstructeursId } from "@pitchou/types/database/public/GroupeInstructeurs.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

/** Thrown when the target dossier does not exist. */
export class DossierNotFoundError extends Error {
  constructor(dossierId: number) {
    super(`Dossier ${dossierId} introuvable`);
    this.name = "DossierNotFoundError";
  }
}

/**
 * Thrown when an operation reserved for Pitchou-native dossiers is attempted
 * on a dossier synchronized from Demarche Numerique (DN stays authoritative
 * for the data it imports: the next sync would overwrite or undo the change).
 */
export class DossierManagedByDnError extends Error {
  fields: string[];

  constructor(dossierId: number, fields: string[] = []) {
    const detail = fields.length >= 1 ? ` (champs : ${fields.join(", ")})` : "";
    super(`Le dossier ${dossierId} est synchronisé depuis Demarche Numerique${detail}`);
    this.name = "DossierManagedByDnError";
    this.fields = fields;
  }
}

/** Dossier columns owned by Pitchou: editable on every dossier. */
export const APP_NATIVE_DOSSIER_COLUMNS = new Set<keyof Dossier>([
  "free_comment",
  "next_action_expected_from",
  "onagre_demande_identifier",
  "enjeu",
  "ddep_required",
  "er_mesures_sufficient",
  "public_consultation_start_date",
  "public_consultation_end_date",
]);

/**
 * Dossier columns imported from Demarche Numerique by the sync: editable only
 * on Pitchou-native dossiers (demarche_numerique_number IS NULL), because the
 * sync overwrites them on every run for DN dossiers.
 */
export const DN_DERIVED_DOSSIER_COLUMNS = new Set<keyof Dossier>([
  "name",
  "description",
  "depot_date",
  "main_activite",
  "type",
  "intervention_start_date",
  "intervention_end_date",
  "commissioning_date",
  "intervention_duration",
  "communes",
  "departments",
  "regions",
  "linked_to_ae_regime",
  "mesures_erc_planned",
  "ecological_inventory_completed",
  "especes_present_in_influence_area",
  "risk_despite_erc_mesures",
  "no_other_satisfactory_solution_justification",
  "motif_derogation",
  "motif_derogation_justification",
  "dossier_oiseau_simple_destroyed_nids_count",
  "dossier_oiseau_simple_compensated_nids_count",
  "scientifique_demande_type",
  "scientifique_demande_purposes",
  "scientifique_previous_assessment",
  "scientifique_suivi_protocol_description",
  "scientifique_capture_mode",
  "scientifique_light_source_conditions",
  "scientifique_marking_conditions",
  "scientifique_transport_conditions",
  "scientifique_intervention_perimeter",
  "scientifique_intervenants",
  "scientifique_other_intervenants_details",
]);

export const ADMIN_EDITABLE_DOSSIER_COLUMNS = new Set<keyof Dossier>([
  ...APP_NATIVE_DOSSIER_COLUMNS,
  ...DN_DERIVED_DOSSIER_COLUMNS,
]);

export type AdminDemandeurPersonnePhysique = {
  first_names: string;
  last_name: string;
  email?: string | null;
};

export type AdminDossierCreation = {
  name: string;
  depot_date: Date;
  phase: DossierPhase;
  groupe_instructeurs: GroupeInstructeursId;
  demandeur_personne_physique?: AdminDemandeurPersonnePhysique | null;
  demandeur_personne_morale?: EntrepriseInitializer | null;
  /** Additional columns, keys restricted to ADMIN_EDITABLE_DOSSIER_COLUMNS */
  columns?: DossierMutator;
};

export type AdminPhaseEvent = { phase: DossierPhase; timestamp: Date };

export type AdminDossierUpdate = {
  columns?: DossierMutator;
  evenementsPhase?: AdminPhaseEvent[];
};

/**
 * Returns the id of the personne with this email, creating the row if needed.
 * Never touches the access_code of an existing personne (the admin may also be
 * an instructeur whose magic-link secret must survive).
 */
export async function ensurePersonneIdByEmail(
  email: string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<PersonneId> {
  const normalized = normalizeEmail(email);
  await databaseConnection("personne")
    .insert({ email: normalized, last_name: "", first_names: "" })
    .onConflict("email")
    .ignore();
  const row = await databaseConnection("personne")
    .select("id")
    .where({ email: normalized })
    .first();
  return row.id;
}

function assertEditableColumns(columns: DossierMutator | undefined) {
  const unknownKeys = Object.keys(columns ?? {}).filter(
    (key) => !ADMIN_EDITABLE_DOSSIER_COLUMNS.has(key as keyof Dossier),
  );
  if (unknownKeys.length >= 1) {
    throw new TypeError(`Colonnes de dossier non modifiables : ${unknownKeys.join(", ")}`);
  }
}

async function ensureDemandeurPersonnePhysiqueId(
  demandeur: AdminDemandeurPersonnePhysique,
  databaseConnection: Knex.Transaction | Knex,
): Promise<PersonneId> {
  if (demandeur.email) {
    const normalized = normalizeEmail(demandeur.email);
    const existing = await databaseConnection("personne")
      .select("id")
      .where({ email: normalized })
      .first();
    if (existing) return existing.id;

    const [row] = await databaseConnection("personne")
      .insert({
        email: normalized,
        first_names: demandeur.first_names,
        last_name: demandeur.last_name,
      })
      .returning("id");
    return row.id;
  }

  const [row] = await databaseConnection("personne")
    .insert({ first_names: demandeur.first_names, last_name: demandeur.last_name })
    .returning("id");
  return row.id;
}

/**
 * Creates a dossier directly in Pitchou, without Demarche Numerique.
 * The dossier is attached to a groupe instructeurs (otherwise no instructeur
 * could see it) and receives an initial phase event caused by the admin's
 * personne (phase events without a personne are filtered out as sync noise).
 */
export async function createDossierFromAdmin(
  creation: AdminDossierCreation,
  adminEmail: string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<{ id: DossierId }> {
  assertEditableColumns(creation.columns);

  return databaseConnection.transaction(async (trx) => {
    const groupe = await trx("groupe_instructeurs")
      .select("id")
      .where({ id: creation.groupe_instructeurs })
      .first();
    if (!groupe) {
      throw new TypeError(`Groupe instructeurs inconnu : ${creation.groupe_instructeurs}`);
    }

    const adminPersonneId = await ensurePersonneIdByEmail(adminEmail, trx);

    let demandeurPersonnePhysiqueId: PersonneId | null = null;
    if (creation.demandeur_personne_physique) {
      demandeurPersonnePhysiqueId = await ensureDemandeurPersonnePhysiqueId(
        creation.demandeur_personne_physique,
        trx,
      );
    }

    let demandeurPersonneMoraleSiret: Entreprise["siret"] | null = null;
    if (creation.demandeur_personne_morale) {
      await dumpEntreprises([creation.demandeur_personne_morale as Entreprise], trx);
      demandeurPersonneMoraleSiret = creation.demandeur_personne_morale.siret;
    }

    const [{ id: dossierId }] = await trx("dossier")
      .insert({
        ...creation.columns,
        name: creation.name,
        depot_date: creation.depot_date,
        demandeur_personne_physique: demandeurPersonnePhysiqueId,
        demandeur_personne_morale: demandeurPersonneMoraleSiret,
        demarche_numerique_id: null,
        demarche_numerique_number: null,
        demarche_number: null,
      })
      .returning("id");

    if (creation.demandeur_personne_physique) {
      const { first_names, last_name, email } = creation.demandeur_personne_physique;
      await trx("identite_dossier").insert({
        dossier: dossierId,
        type: "demandeur",
        first_names,
        last_name,
        email: email ? normalizeEmail(email) : null,
      });
    }

    await trx("edge_groupe_instructeurs__dossier").insert({
      dossier: dossierId,
      groupe_instructeurs: creation.groupe_instructeurs,
    });

    await trx("evenement_phase_dossier").insert({
      dossier: dossierId,
      phase: creation.phase,
      timestamp: new Date(),
      caused_by_personne: adminPersonneId,
    });

    return { id: dossierId };
  });
}

/**
 * Loads the dossier and throws if it does not exist. Returns whether it is
 * managed by Demarche Numerique (i.e. was imported by the sync).
 */
export async function getDossierSyncStatus(
  dossierId: DossierId,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<{ managedByDn: boolean }> {
  const dossier = await databaseConnection("dossier")
    .select("demarche_numerique_number")
    .where({ id: dossierId })
    .first();
  if (!dossier) throw new DossierNotFoundError(dossierId);
  return { managedByDn: dossier.demarche_numerique_number !== null };
}

/**
 * Updates dossier columns and/or appends phase events, on behalf of an admin.
 * DN-derived columns are rejected on DN-synced dossiers: the next sync run
 * would overwrite them within minutes, which would be a silent trap.
 */
export async function updateDossierFromAdmin(
  dossierId: DossierId,
  update: AdminDossierUpdate,
  adminEmail: string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  assertEditableColumns(update.columns);

  await databaseConnection.transaction(async (trx) => {
    const { managedByDn } = await getDossierSyncStatus(dossierId, trx);

    if (managedByDn) {
      const dnFields = Object.keys(update.columns ?? {}).filter((key) =>
        DN_DERIVED_DOSSIER_COLUMNS.has(key as keyof Dossier),
      );
      if (dnFields.length >= 1) {
        throw new DossierManagedByDnError(dossierId, dnFields);
      }
    }

    const adminPersonneId = await ensurePersonneIdByEmail(adminEmail, trx);

    // caused_by_personne is overwritten by updateDossier with the admin's personne
    const evenementsPhase = update.evenementsPhase?.map(({ phase, timestamp }) => ({
      dossier: dossierId,
      phase,
      timestamp,
      caused_by_personne: null,
      demarche_numerique_agent_email: null,
      demarche_numerique_motivation: null,
    }));

    await updateDossier(
      dossierId,
      { ...update.columns, ...(evenementsPhase ? { evenementsPhase } : {}) },
      adminPersonneId,
      trx,
    );
  });
}

/**
 * Deletes a Pitchou-native dossier and its now-orphaned files (DB rows cascade;
 * file rows and S3 objects do not). Deleting DN-synced dossiers is refused:
 * their lifecycle, deletion included, is driven by Demarche Numerique.
 */
export async function deleteDossierFromAdmin(
  dossierId: DossierId,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  await databaseConnection.transaction(async (trx) => {
    const { managedByDn } = await getDossierSyncStatus(dossierId, trx);
    if (managedByDn) throw new DossierManagedByDnError(dossierId);

    const fileIds = await collectDossierFileIds(dossierId, trx);
    await trx("dossier").where({ id: dossierId }).delete();
    await deleteFichiersWithoutOtherReferences(fileIds, trx);
  });
}

/** Collects every file id referenced by a dossier, for cleanup after deletion. */
async function collectDossierFileIds(
  dossierId: DossierId,
  databaseConnection: Knex.Transaction | Knex,
): Promise<FileId[]> {
  const [dossier, pjEdges, decisions, avis, otherAttachments] = await Promise.all([
    databaseConnection("dossier").select("especes_impactees").where({ id: dossierId }).first(),
    databaseConnection("edge_dossier__fichier_pieces_jointes_petitionnaire")
      .select("fichier")
      .where({ dossier: dossierId }),
    databaseConnection("decision_administrative").select("fichier").where({ dossier: dossierId }),
    databaseConnection("avis_expert")
      .select(["saisine_fichier", "avis_fichier"])
      .where({ dossier: dossierId }),
    databaseConnection("other_attachment").select("fichier").where({ dossier: dossierId }),
  ]);

  const fileIds = [
    dossier?.especes_impactees,
    ...pjEdges.map((edge: { fichier: FileId }) => edge.fichier),
    ...decisions.map((decision: { fichier: FileId | null }) => decision.fichier),
    ...avis.flatMap((a: { saisine_fichier: FileId | null; avis_fichier: FileId | null }) => [
      a.saisine_fichier,
      a.avis_fichier,
    ]),
    ...otherAttachments.map((attachment: { fichier: FileId | null }) => attachment.fichier),
  ];

  return [...new Set(fileIds.filter((id): id is FileId => Boolean(id)))];
}
