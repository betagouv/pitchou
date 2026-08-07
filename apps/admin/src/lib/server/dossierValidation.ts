import { error } from "@sveltejs/kit";
import { phases } from "@pitchou/common/phases.ts";
import {
  DossierManagedByDnError,
  DossierNotCreatedInPitchouError,
  DossierNotFoundError,
  DossierUnknownSourceError,
  type AdminDossierCreation,
  type AdminDossierUpdate,
  type AdminPhaseEvent,
} from "@pitchou/server/database/dossier_admin.ts";
import type { AdminDossierRelations } from "@pitchou/server/database/dossier_admin_relations.ts";
import type { DossierPhase } from "@pitchou/types/API_Pitchou.ts";
import type { DossierId, DossierMutator } from "@pitchou/types/database/public/Dossier.ts";
import { parseColumns } from "./dossierValidation/dossierColumnValidation";
import {
  isValidPhone,
  validateCreationCore,
} from "./dossierValidation/dossierCreationCoreValidation.ts";
import { validateCreationScientific } from "./dossierValidation/dossierCreationScientificValidation.ts";
import { parseDossierRelations } from "./dossierValidation/dossierRelationsValidation";
import { rejectUnknownProperties } from "./requestValidation";

export function parseDossierId(raw: string): DossierId {
  const id = Number(raw);
  if (!Number.isFinite(id)) error(400, "Invalid dossierId.");
  return id as DossierId;
}
function parseDate(property: string, raw: unknown): Date {
  if (typeof raw !== "string" || Number.isNaN(Date.parse(raw)))
    error(400, `Property '${property}' must be a valid date.`);
  return new Date(raw);
}
function parsePhase(raw: unknown): DossierPhase {
  if (typeof raw !== "string" || !phases.has(raw as DossierPhase))
    error(400, `Property 'phase' is invalid.`);
  return raw as DossierPhase;
}
function parsePhaseEvents(raw: unknown): AdminPhaseEvent[] {
  if (!Array.isArray(raw)) error(400, `Property 'evenementsPhase' must be an array.`);
  return raw.map((event) => {
    if (!event || typeof event !== "object" || Array.isArray(event))
      error(400, "Each phase event must be an object.");
    const value = event as Record<string, unknown>;
    rejectUnknownProperties(value, new Set(["phase", "timestamp"]));
    return { phase: parsePhase(value.phase), timestamp: parseDate("timestamp", value.timestamp) };
  });
}
function parseCreationRelations(raw: unknown): AdminDossierRelations {
  const relations = parseDossierRelations(raw);
  if (relations.demandeur_type === "personne_physique") {
    const demandeur = relations.identites.find(({ type }) => type === "demandeur")!;
    if (
      relations.demandeur_personne_physique.last_name.trim() !== demandeur.last_name?.trim() ||
      relations.demandeur_personne_physique.first_names.trim() !== demandeur.first_names?.trim()
    )
      error(400, `The physical demandeur and its identity must match.`);
    const phone = relations.demandeur_personne_physique.phone;
    if (phone && !isValidPhone(phone))
      error(400, `The physical demandeur phone number must be valid.`);
  } else if (!relations.identites.find(({ type }) => type === "representant")) {
    error(400, `A representative identity is required for a legal demandeur.`);
  }
  for (const identity of relations.identites)
    if (identity.phone && !isValidPhone(identity.phone))
      error(400, `Identity phone numbers must be valid.`);
  return relations;
}
function parseCreationColumns(raw: unknown): DossierMutator {
  if (raw === undefined) error(400, `Property 'columns' is required.`);
  const columns = parseColumns(raw);
  validateCreationCore(columns, raw as Record<string, unknown>);
  validateCreationScientific(columns, raw as Record<string, unknown>);
  return columns;
}
export function parseDossierCreation(body: Record<string, unknown>): AdminDossierCreation {
  rejectUnknownProperties(body, new Set(["name", "depot_date", "phase", "relations", "columns"]));
  if (typeof body.name !== "string" || !body.name.trim())
    error(400, `Property 'name' is required.`);
  return {
    name: body.name.trim(),
    depot_date: parseDate("depot_date", body.depot_date),
    phase: parsePhase(body.phase),
    relations: parseCreationRelations(body.relations),
    columns: parseCreationColumns(body.columns),
  };
}
export function parseDossierUpdate(body: Record<string, unknown>): AdminDossierUpdate {
  rejectUnknownProperties(body, new Set(["columns", "evenementsPhase", "relations"]));
  const update: AdminDossierUpdate = {};
  if (body.columns !== undefined) update.columns = parseColumns(body.columns);
  const windColumns = [
    "eolien_commissioning_year",
    "eolien_turbines_count",
    "eolien_tip_height",
    "eolien_rotor_diameter",
    "eolien_ground_clearance",
    "eolien_monitored_turbines_count",
    "eolien_field_inventory_period",
    "eolien_monitoring_visits_count",
    "eolien_weekly_monitoring_visits_count",
    "eolien_mortality_actions",
    "eolien_carcass_collection_method",
    "eolien_carcass_preservation_method",
    "eolien_carcass_examination_address",
  ];
  if (
    update.columns &&
    windColumns.some((column) => update.columns![column as keyof DossierMutator] != null) &&
    update.columns.main_activite !== "Production énergie renouvelable - Éolien -  Suivi mortalité"
  )
    error(400, `Wind farm properties require the wind mortality main activity.`);
  if (
    update.columns?.intervention_start_date instanceof Date &&
    update.columns.intervention_end_date instanceof Date &&
    update.columns.intervention_end_date < update.columns.intervention_start_date
  )
    error(400, `Property 'intervention_end_date' cannot precede 'intervention_start_date'.`);
  if (body.evenementsPhase !== undefined)
    update.evenementsPhase = parsePhaseEvents(body.evenementsPhase);
  if (body.relations !== undefined) update.relations = parseDossierRelations(body.relations);
  if (!update.columns && !update.evenementsPhase && !update.relations)
    error(400, `The body must contain 'columns', 'evenementsPhase', and/or 'relations'.`);
  return update;
}
export function throwHttpErrorForAdminDossier(caught: unknown): never {
  if (caught instanceof DossierNotFoundError) error(404, caught.message);
  if (
    caught instanceof DossierManagedByDnError ||
    caught instanceof DossierUnknownSourceError ||
    caught instanceof DossierNotCreatedInPitchouError
  )
    error(409, caught.message);
  if (caught instanceof TypeError) error(400, caught.message);
  throw caught;
}
