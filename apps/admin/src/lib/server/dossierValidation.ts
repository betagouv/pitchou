import { error } from "@sveltejs/kit";

import { phases } from "@pitchou/common/phases.ts";
import {
  DossierManagedByDnError,
  DossierNotFoundError,
  type AdminDemandeurPersonnePhysique,
  type AdminDossierCreation,
  type AdminDossierUpdate,
  type AdminPhaseEvent,
} from "@pitchou/server/database/dossier_admin.ts";

import type { DossierPhase } from "@pitchou/types/API_Pitchou.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type {
  EntrepriseInitializer,
  EntrepriseSiret,
} from "@pitchou/types/database/public/Entreprise.ts";
import type { GroupeInstructeursId } from "@pitchou/types/database/public/GroupeInstructeurs.ts";

import { parseColumns } from "./dossierColumnValidation";
import { parseDossierRelations } from "./dossierRelationsValidation";
import { rejectUnknownProperties } from "./requestValidation";

export function parseDossierId(raw: string): DossierId {
  const id = Number(raw);
  if (!Number.isFinite(id)) error(400, "Invalid dossierId.");
  return id as DossierId;
}

function parseDate(property: string, raw: unknown): Date {
  if (typeof raw !== "string" || Number.isNaN(Date.parse(raw))) {
    error(400, `Property '${property}' must be a valid date.`);
  }
  return new Date(raw);
}

function parsePhase(raw: unknown): DossierPhase {
  if (typeof raw !== "string" || !phases.has(raw as DossierPhase)) {
    error(400, `Property 'phase' is invalid.`);
  }
  return raw as DossierPhase;
}

function parsePhaseEvents(raw: unknown): AdminPhaseEvent[] {
  if (!Array.isArray(raw)) error(400, `Property 'evenementsPhase' must be an array.`);
  return raw.map((event) => {
    if (!event || typeof event !== "object" || Array.isArray(event)) {
      error(400, "Each phase event must be an object.");
    }
    const value = event as Record<string, unknown>;
    rejectUnknownProperties(value, new Set(["phase", "timestamp"]));
    return {
      phase: parsePhase(value.phase),
      timestamp: parseDate("timestamp", value.timestamp),
    };
  });
}

function parseCreationPersonnePhysique(raw: unknown): AdminDemandeurPersonnePhysique {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    error(400, `Property 'demandeur_personne_physique' must be an object.`);
  }
  const value = raw as Record<string, unknown>;
  rejectUnknownProperties(value, new Set(["first_names", "last_name", "email"]));
  if (typeof value.last_name !== "string" || value.last_name.trim() === "") {
    error(400, `Property 'last_name' is required for the demandeur.`);
  }
  if (value.first_names !== undefined && typeof value.first_names !== "string") {
    error(400, `Property 'first_names' must be a string.`);
  }
  if (
    value.email !== undefined &&
    value.email !== null &&
    (typeof value.email !== "string" || !value.email.includes("@"))
  ) {
    error(400, `Property 'email' must be an email address.`);
  }
  return {
    last_name: value.last_name.trim(),
    first_names: typeof value.first_names === "string" ? value.first_names.trim() : "",
    email: typeof value.email === "string" ? value.email : null,
  };
}

function parseCreationPersonneMorale(raw: unknown): EntrepriseInitializer {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    error(400, `Property 'demandeur_personne_morale' must be an object.`);
  }
  const value = raw as Record<string, unknown>;
  const nullableProperties = ["legal_name", "address", "postal_code", "department", "region"];
  rejectUnknownProperties(value, new Set(["siret", ...nullableProperties]));
  if (typeof value.siret !== "string" || !/^\d{14}$/.test(value.siret)) {
    error(400, `Property 'siret' must contain exactly 14 digits.`);
  }
  for (const property of nullableProperties) {
    if (
      value[property] !== undefined &&
      value[property] !== null &&
      typeof value[property] !== "string"
    ) {
      error(400, `Property '${property}' must be a string.`);
    }
  }
  return {
    siret: value.siret as EntrepriseSiret,
    siren: value.siret.slice(0, 9),
    legal_name: (value.legal_name as string | null | undefined) ?? null,
    address: (value.address as string | null | undefined) ?? null,
    postal_code: (value.postal_code as string | null | undefined) ?? null,
    department: (value.department as string | null | undefined) ?? null,
    region: (value.region as string | null | undefined) ?? null,
  };
}

const CREATION_PROPERTIES = new Set([
  "name",
  "depot_date",
  "phase",
  "groupe_instructeurs",
  "demandeur_personne_physique",
  "demandeur_personne_morale",
  "columns",
]);

export function parseDossierCreation(body: Record<string, unknown>): AdminDossierCreation {
  rejectUnknownProperties(body, CREATION_PROPERTIES);
  if (typeof body.name !== "string" || body.name.trim() === "") {
    error(400, `Property 'name' is required.`);
  }
  if (typeof body.groupe_instructeurs !== "string" || body.groupe_instructeurs === "") {
    error(400, `Property 'groupe_instructeurs' is required.`);
  }
  const hasPhysique =
    body.demandeur_personne_physique !== undefined && body.demandeur_personne_physique !== null;
  const hasMorale =
    body.demandeur_personne_morale !== undefined && body.demandeur_personne_morale !== null;
  if (hasPhysique === hasMorale) {
    error(400, `Exactly one physical or legal demandeur is required.`);
  }
  return {
    name: body.name.trim(),
    depot_date: parseDate("depot_date", body.depot_date),
    phase: parsePhase(body.phase),
    groupe_instructeurs: body.groupe_instructeurs as GroupeInstructeursId,
    demandeur_personne_physique: hasPhysique
      ? parseCreationPersonnePhysique(body.demandeur_personne_physique)
      : null,
    demandeur_personne_morale: hasMorale
      ? parseCreationPersonneMorale(body.demandeur_personne_morale)
      : null,
    columns: body.columns !== undefined ? parseColumns(body.columns) : undefined,
  };
}

export function parseDossierUpdate(body: Record<string, unknown>): AdminDossierUpdate {
  rejectUnknownProperties(body, new Set(["columns", "evenementsPhase", "relations"]));
  const update: AdminDossierUpdate = {};
  if (body.columns !== undefined) update.columns = parseColumns(body.columns);
  if (body.evenementsPhase !== undefined) {
    update.evenementsPhase = parsePhaseEvents(body.evenementsPhase);
  }
  if (body.relations !== undefined) update.relations = parseDossierRelations(body.relations);
  if (!update.columns && !update.evenementsPhase && !update.relations) {
    error(400, `The body must contain 'columns', 'evenementsPhase', and/or 'relations'.`);
  }
  return update;
}

export function throwHttpErrorForAdminDossier(err: unknown): never {
  if (err instanceof DossierNotFoundError) error(404, err.message);
  if (err instanceof DossierManagedByDnError) error(409, err.message);
  if (err instanceof TypeError) error(400, err.message);
  throw err;
}
