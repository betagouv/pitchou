import { error } from "@sveltejs/kit";

import { phases, prochaineActionAttenduePar } from "@pitchou/common/phases.ts";
import {
  ADMIN_EDITABLE_DOSSIER_COLUMNS,
  DossierManagedByDnError,
  DossierNotFoundError,
  type AdminDemandeurPersonnePhysique,
  type AdminDossierCreation,
  type AdminDossierUpdate,
  type AdminPhaseEvent,
} from "@pitchou/server/database/dossier_admin.ts";
import { rejectUnknownProperties } from "./requestValidation";

import type { DossierNextActionExpectedFrom, DossierPhase } from "@pitchou/types/API_Pitchou.ts";
import type { DossierId, DossierMutator } from "@pitchou/types/database/public/Dossier.ts";
import type {
  EntrepriseInitializer,
  EntrepriseSiret,
} from "@pitchou/types/database/public/Entreprise.ts";
import type { GroupeInstructeursId } from "@pitchou/types/database/public/GroupeInstructeurs.ts";

type ColumnKind = "string" | "boolean" | "integer" | "date" | "stringArray" | "communes";

/** Value shape expected for each admin-editable dossier column. */
const COLUMN_KINDS: Record<string, ColumnKind> = {
  name: "string",
  description: "string",
  main_activite: "string",
  type: "string",
  no_other_satisfactory_solution_justification: "string",
  motif_derogation: "string",
  motif_derogation_justification: "string",
  free_comment: "string",
  onagre_demande_identifier: "string",
  next_action_expected_from: "string",
  scientifique_suivi_protocol_description: "string",
  scientifique_light_source_conditions: "string",
  scientifique_marking_conditions: "string",
  scientifique_transport_conditions: "string",
  scientifique_intervention_perimeter: "string",
  scientifique_other_intervenants_details: "string",
  enjeu: "boolean",
  ddep_required: "boolean",
  er_mesures_sufficient: "boolean",
  linked_to_ae_regime: "boolean",
  mesures_erc_planned: "boolean",
  ecological_inventory_completed: "boolean",
  especes_present_in_influence_area: "boolean",
  risk_despite_erc_mesures: "boolean",
  scientifique_previous_assessment: "boolean",
  intervention_duration: "integer",
  dossier_oiseau_simple_destroyed_nids_count: "integer",
  dossier_oiseau_simple_compensated_nids_count: "integer",
  depot_date: "date",
  intervention_start_date: "date",
  intervention_end_date: "date",
  commissioning_date: "date",
  public_consultation_start_date: "date",
  public_consultation_end_date: "date",
  scientifique_demande_type: "stringArray",
  scientifique_demande_purposes: "stringArray",
  scientifique_capture_mode: "stringArray",
  scientifique_intervenants: "stringArray",
  departments: "stringArray",
  regions: "stringArray",
  communes: "communes",
};

// Keep the validator exhaustive: every column the server accepts must have a
// declared kind here, otherwise it would be unreachable through the API.
for (const column of ADMIN_EDITABLE_DOSSIER_COLUMNS) {
  if (!(column in COLUMN_KINDS)) {
    throw new Error(`Missing validation kind for dossier column '${column}'`);
  }
}

/** NOT NULL columns: null must be rejected, only a value (or absence) is valid. */
const NON_NULLABLE_COLUMNS = new Set(["free_comment", "onagre_demande_identifier", "enjeu"]);

const TYPE_DOSSIER_VALUES = new Set(["Hirondelle", "Cigogne"]);

export function parseDossierId(raw: string): DossierId {
  const id = Number(raw);
  if (!Number.isFinite(id)) {
    error(400, "dossierId invalide");
  }
  return id as DossierId;
}

function parseDate(property: string, raw: unknown): Date {
  if (typeof raw !== "string" || Number.isNaN(Date.parse(raw))) {
    error(400, `La propriété '${property}' doit être une date valide.`);
  }
  return new Date(raw);
}

function parseColumnValue(column: string, kind: ColumnKind, raw: unknown): unknown {
  switch (kind) {
    case "string":
      if (typeof raw !== "string") {
        error(400, `La propriété '${column}' doit être une chaîne.`);
      }
      if (column === "next_action_expected_from") {
        if (!prochaineActionAttenduePar.has(raw as DossierNextActionExpectedFrom)) {
          error(400, `La propriété 'next_action_expected_from' n'est pas valide.`);
        }
      }
      if (column === "type" && !TYPE_DOSSIER_VALUES.has(raw)) {
        error(400, `La propriété 'type' doit valoir "Hirondelle" ou "Cigogne".`);
      }
      return raw;
    case "boolean":
      if (typeof raw !== "boolean") {
        error(400, `La propriété '${column}' doit être un booléen.`);
      }
      return raw;
    case "integer":
      if (typeof raw !== "number" || !Number.isInteger(raw)) {
        error(400, `La propriété '${column}' doit être un nombre entier.`);
      }
      return raw;
    case "date":
      return parseDate(column, raw);
    case "stringArray":
      if (!Array.isArray(raw) || raw.some((item) => typeof item !== "string")) {
        error(400, `La propriété '${column}' doit être un tableau de chaînes.`);
      }
      return JSON.stringify(raw);
    case "communes":
      if (
        !Array.isArray(raw) ||
        raw.some(
          (item) =>
            !item ||
            typeof item !== "object" ||
            typeof (item as Record<string, unknown>).name !== "string",
        )
      ) {
        error(400, `La propriété 'communes' doit être un tableau d'objets avec un 'name'.`);
      }
      return JSON.stringify(raw);
  }
}

export function parseColumns(raw: unknown): DossierMutator {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    error(400, `La propriété 'columns' doit être un objet.`);
  }

  const columns: Record<string, unknown> = {};
  for (const [column, value] of Object.entries(raw)) {
    const kind = COLUMN_KINDS[column];
    if (!kind) {
      error(400, `Colonne de dossier non modifiable : '${column}'.`);
    }
    if (value === undefined) continue;
    if (value === null) {
      if (NON_NULLABLE_COLUMNS.has(column)) {
        error(400, `La propriété '${column}' ne peut pas être null.`);
      }
      columns[column] = null;
      continue;
    }
    columns[column] = parseColumnValue(column, kind, value);
  }

  return columns as DossierMutator;
}

export function parsePhase(raw: unknown): DossierPhase {
  if (typeof raw !== "string" || !phases.has(raw as DossierPhase)) {
    error(400, `La propriété 'phase' n'est pas valide.`);
  }
  return raw as DossierPhase;
}

const phaseEventProperties = new Set(["phase", "timestamp"]);

export function parsePhaseEvents(raw: unknown): AdminPhaseEvent[] {
  if (!Array.isArray(raw)) {
    error(400, `La propriété 'evenementsPhase' doit être un tableau.`);
  }
  return raw.map((event) => {
    if (!event || typeof event !== "object" || Array.isArray(event)) {
      error(400, "Chaque évènement de phase doit être un objet.");
    }
    rejectUnknownProperties(event as Record<string, unknown>, phaseEventProperties);
    return {
      phase: parsePhase((event as Record<string, unknown>).phase),
      timestamp: parseDate("timestamp", (event as Record<string, unknown>).timestamp),
    };
  });
}

const demandeurPersonnePhysiqueProperties = new Set(["first_names", "last_name", "email"]);

function parseDemandeurPersonnePhysique(raw: unknown): AdminDemandeurPersonnePhysique {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    error(400, `La propriété 'demandeur_personne_physique' doit être un objet.`);
  }
  const demandeur = raw as Record<string, unknown>;
  rejectUnknownProperties(demandeur, demandeurPersonnePhysiqueProperties);

  if (typeof demandeur.last_name !== "string" || demandeur.last_name.trim() === "") {
    error(400, `La propriété 'last_name' du demandeur est requise.`);
  }
  if (demandeur.first_names !== undefined && typeof demandeur.first_names !== "string") {
    error(400, `La propriété 'first_names' du demandeur doit être une chaîne.`);
  }
  if (
    demandeur.email !== undefined &&
    demandeur.email !== null &&
    (typeof demandeur.email !== "string" || !demandeur.email.includes("@"))
  ) {
    error(400, `La propriété 'email' du demandeur doit être une adresse email.`);
  }

  return {
    last_name: demandeur.last_name.trim(),
    first_names: typeof demandeur.first_names === "string" ? demandeur.first_names.trim() : "",
    email: typeof demandeur.email === "string" ? demandeur.email : null,
  };
}

const demandeurPersonneMoraleProperties = new Set([
  "siret",
  "legal_name",
  "address",
  "postal_code",
  "department",
  "region",
]);

function parseDemandeurPersonneMorale(raw: unknown): EntrepriseInitializer {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    error(400, `La propriété 'demandeur_personne_morale' doit être un objet.`);
  }
  const entreprise = raw as Record<string, unknown>;
  rejectUnknownProperties(entreprise, demandeurPersonneMoraleProperties);

  if (typeof entreprise.siret !== "string" || !/^\d{14}$/.test(entreprise.siret)) {
    error(400, `La propriété 'siret' doit être un SIRET de 14 chiffres.`);
  }
  for (const property of ["legal_name", "address", "postal_code", "department", "region"]) {
    if (
      entreprise[property] !== undefined &&
      entreprise[property] !== null &&
      typeof entreprise[property] !== "string"
    ) {
      error(400, `La propriété '${property}' de l'entreprise doit être une chaîne.`);
    }
  }

  return {
    siret: entreprise.siret as EntrepriseSiret,
    siren: (entreprise.siret as string).slice(0, 9),
    legal_name: (entreprise.legal_name as string | null | undefined) ?? null,
    address: (entreprise.address as string | null | undefined) ?? null,
    postal_code: (entreprise.postal_code as string | null | undefined) ?? null,
    department: (entreprise.department as string | null | undefined) ?? null,
    region: (entreprise.region as string | null | undefined) ?? null,
  };
}

const dossierCreationProperties = new Set([
  "name",
  "depot_date",
  "phase",
  "groupe_instructeurs",
  "demandeur_personne_physique",
  "demandeur_personne_morale",
  "columns",
]);

export function parseDossierCreation(body: Record<string, unknown>): AdminDossierCreation {
  rejectUnknownProperties(body, dossierCreationProperties);

  if (typeof body.name !== "string" || body.name.trim() === "") {
    error(400, `La propriété 'name' est requise.`);
  }
  if (typeof body.groupe_instructeurs !== "string" || body.groupe_instructeurs === "") {
    error(400, `La propriété 'groupe_instructeurs' est requise.`);
  }

  const hasPersonnePhysique =
    body.demandeur_personne_physique !== undefined && body.demandeur_personne_physique !== null;
  const hasPersonneMorale =
    body.demandeur_personne_morale !== undefined && body.demandeur_personne_morale !== null;
  if (hasPersonnePhysique === hasPersonneMorale) {
    error(
      400,
      `Un demandeur est requis : soit 'demandeur_personne_physique', soit 'demandeur_personne_morale'.`,
    );
  }

  return {
    name: body.name.trim(),
    depot_date: parseDate("depot_date", body.depot_date),
    phase: parsePhase(body.phase),
    groupe_instructeurs: body.groupe_instructeurs as GroupeInstructeursId,
    demandeur_personne_physique: hasPersonnePhysique
      ? parseDemandeurPersonnePhysique(body.demandeur_personne_physique)
      : null,
    demandeur_personne_morale: hasPersonneMorale
      ? parseDemandeurPersonneMorale(body.demandeur_personne_morale)
      : null,
    columns: body.columns !== undefined ? parseColumns(body.columns) : undefined,
  };
}

const dossierUpdateProperties = new Set(["columns", "evenementsPhase"]);

export function parseDossierUpdate(body: Record<string, unknown>): AdminDossierUpdate {
  rejectUnknownProperties(body, dossierUpdateProperties);

  const update: AdminDossierUpdate = {};
  if (body.columns !== undefined) {
    update.columns = parseColumns(body.columns);
  }
  if (body.evenementsPhase !== undefined) {
    update.evenementsPhase = parsePhaseEvents(body.evenementsPhase);
  }
  if (update.columns === undefined && update.evenementsPhase === undefined) {
    error(400, `Le corps doit contenir 'columns' et/ou 'evenementsPhase'.`);
  }

  return update;
}

/** Maps domain errors from the server layer to HTTP errors. */
export function throwHttpErrorForAdminDossier(err: unknown): never {
  if (err instanceof DossierNotFoundError) {
    error(404, err.message);
  }
  if (err instanceof DossierManagedByDnError) {
    error(409, err.message);
  }
  if (err instanceof TypeError) {
    error(400, err.message);
  }
  throw err;
}
