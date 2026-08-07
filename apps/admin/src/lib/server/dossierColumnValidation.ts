import { error } from "@sveltejs/kit";

import { prochaineActionAttenduePar } from "@pitchou/common/phases.ts";

import type { DossierNextActionExpectedFrom } from "@pitchou/types/API_Pitchou.ts";
import type { DossierMutator } from "@pitchou/types/database/public/Dossier.ts";

import { isValidProjectMap } from "$lib/projectMapValidation.ts";

import { COLUMN_KINDS, type ColumnKind } from "./dossierColumnKinds.ts";
import {
  AE_PROCEDURE_VALUES,
  DEPARTEMENT_VALUES,
  EOLIEN_MORTALITY_ACTION_VALUES,
  ESPECES_PRISE_DETENTION_LIMITEE_TYPE_VALUES,
  LOCATION_SCOPE_VALUES,
  MAIN_ACTIVITE_VALUES,
  MOTIF_DEROGATION_VALUES,
  REGION_VALUES,
  REQUEST_CONTEXT_VALUES,
  SCIENTIFIQUE_DEMANDE_PURPOSE_VALUES,
  SCIENTIFIQUE_DEMANDE_TYPE_VALUES,
} from "./dossierColumnAcceptedValues.ts";

const NON_NULLABLE_COLUMNS = new Set(["free_comment", "onagre_demande_identifier", "enjeu"]);
const TYPE_DOSSIER_VALUES = new Set(["Hirondelle", "Cigogne"]);
const EOLIEN_DECIMAL_COLUMNS = new Set([
  "eolien_tip_height",
  "eolien_rotor_diameter",
  "eolien_ground_clearance",
]);

function parseDate(column: string, raw: unknown): Date {
  if (typeof raw !== "string" || Number.isNaN(Date.parse(raw))) {
    error(400, `Property '${column}' must be a valid date.`);
  }
  return new Date(raw);
}

function parseString(column: string, raw: unknown): string {
  if (typeof raw !== "string") error(400, `Property '${column}' must be a string.`);
  if (
    column === "next_action_expected_from" &&
    !prochaineActionAttenduePar.has(raw as DossierNextActionExpectedFrom)
  ) {
    error(400, `Property 'next_action_expected_from' is invalid.`);
  }
  if (column === "type" && !TYPE_DOSSIER_VALUES.has(raw)) {
    error(400, `Property 'type' must be "Hirondelle" or "Cigogne".`);
  }
  if (column === "main_activite" && !MAIN_ACTIVITE_VALUES.has(raw)) {
    error(400, `Property 'main_activite' is invalid.`);
  }
  if (column === "request_context" && !REQUEST_CONTEXT_VALUES.has(raw)) {
    error(400, `Property 'request_context' is invalid.`);
  }
  if (column === "motif_derogation" && !MOTIF_DEROGATION_VALUES.has(raw)) {
    error(400, `Property 'motif_derogation' is invalid.`);
  }
  if (
    column === "especes_prise_detention_limitee_type" &&
    !ESPECES_PRISE_DETENTION_LIMITEE_TYPE_VALUES.has(raw)
  ) {
    error(400, `Property 'especes_prise_detention_limitee_type' is invalid.`);
  }
  if (column === "location_scope" && !LOCATION_SCOPE_VALUES.has(raw)) {
    error(400, `Property 'location_scope' is invalid.`);
  }
  if (column === "primary_department" && !DEPARTEMENT_VALUES.has(raw)) {
    error(400, `Property 'primary_department' is invalid.`);
  }
  return raw;
}

function parseStringArray(column: string, raw: unknown): string {
  if (!Array.isArray(raw) || raw.some((item) => typeof item !== "string")) {
    error(400, `Property '${column}' must be an array of strings.`);
  }
  const acceptedValues =
    column === "scientifique_demande_type"
      ? SCIENTIFIQUE_DEMANDE_TYPE_VALUES
      : column === "ae_procedures"
        ? AE_PROCEDURE_VALUES
        : column === "eolien_mortality_actions"
          ? EOLIEN_MORTALITY_ACTION_VALUES
          : column === "scientifique_demande_purposes"
            ? SCIENTIFIQUE_DEMANDE_PURPOSE_VALUES
            : column === "departments"
              ? DEPARTEMENT_VALUES
              : column === "regions"
                ? REGION_VALUES
                : null;
  if (acceptedValues && raw.some((item) => !acceptedValues.has(item))) {
    error(400, `Property '${column}' contains an invalid value.`);
  }
  return JSON.stringify(raw);
}

function parseStructuredColumn(column: string, raw: unknown): string {
  if (column === "communes") {
    if (
      !Array.isArray(raw) ||
      raw.some(
        (item) =>
          !item ||
          typeof item !== "object" ||
          typeof (item as { name?: unknown }).name !== "string",
      )
    ) {
      error(400, `Property 'communes' must be an array of objects with a string 'name'.`);
    }
  } else if (column === "scientifique_intervenants") {
    if (
      !Array.isArray(raw) ||
      raw.some((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return true;
        const value = item as Record<string, unknown>;
        return (
          Object.keys(value).some((key) => !["nom_complet", "qualification"].includes(key)) ||
          (typeof value.nom_complet !== "string" && value.nom_complet !== null) ||
          (typeof value.qualification !== "string" && value.qualification !== null)
        );
      })
    ) {
      error(400, `Property 'scientifique_intervenants' is invalid.`);
    }
  } else {
    if (!isValidProjectMap(raw)) {
      error(400, `Property 'projet_map' must be a valid GeoJSON FeatureCollection.`);
    }
  }
  return JSON.stringify(raw);
}

function parseColumnValue(column: string, kind: ColumnKind, raw: unknown): unknown {
  if (column === "linked_to_ae_regime" && raw === "unknown") return null;
  if (kind === "string") return parseString(column, raw);
  if (kind === "date") return parseDate(column, raw);
  if (kind === "stringArray") return parseStringArray(column, raw);
  if (["communes", "intervenants", "geoJson"].includes(kind)) {
    return parseStructuredColumn(column, raw);
  }
  if (kind === "boolean" && typeof raw !== "boolean") {
    error(400, `Property '${column}' must be a boolean.`);
  }
  if (kind === "integer" && (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0)) {
    error(400, `Property '${column}' must be a non-negative integer.`);
  }
  if (kind === "number" && (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0)) {
    error(400, `Property '${column}' must be a non-negative number.`);
  }
  if (column === "intervention_duration" && typeof raw === "number" && raw <= 0) {
    error(400, `Property 'intervention_duration' must be positive.`);
  }
  if (
    column === "dossier_oiseau_simple_compensated_nids_count" &&
    typeof raw === "number" &&
    raw <= 0
  ) {
    error(400, `Property 'dossier_oiseau_simple_compensated_nids_count' must be positive.`);
  }
  if (
    kind === "number" &&
    EOLIEN_DECIMAL_COLUMNS.has(column) &&
    typeof raw === "number" &&
    Math.abs(raw * 1000 - Math.round(raw * 1000)) > 1e-9
  ) {
    error(400, `Property '${column}' cannot have more than three decimal places.`);
  }
  return raw;
}

export function parseColumns(raw: unknown): DossierMutator {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    error(400, `Property 'columns' must be an object.`);
  }
  const columns: Record<string, unknown> = {};
  for (const [column, value] of Object.entries(raw)) {
    const kind = COLUMN_KINDS[column];
    if (!kind) error(400, `Dossier column '${column}' is not editable.`);
    if (value === undefined) continue;
    if (value === null) {
      if (NON_NULLABLE_COLUMNS.has(column)) {
        error(400, `Property '${column}' cannot be null.`);
      }
      columns[column] = null;
    } else {
      columns[column] = parseColumnValue(column, kind, value);
    }
  }
  return columns as DossierMutator;
}
