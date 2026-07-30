import { error } from "@sveltejs/kit";

import { departements } from "@pitchou/common/departements.ts";
import {
  dossierLocationScopeOptions,
  dossierMainActiviteOptions,
  dossierRegionOptions,
  motifDerogationOptions,
  scientifiqueDemandePurposeOptions,
  scientifiqueDemandeTypeOptions,
} from "@pitchou/common/dossierFormOptions.ts";
import { prochaineActionAttenduePar } from "@pitchou/common/phases.ts";

import type { DossierNextActionExpectedFrom } from "@pitchou/types/API_Pitchou.ts";
import type { DossierMutator } from "@pitchou/types/database/public/Dossier.ts";

import { COLUMN_KINDS, type ColumnKind } from "./dossierColumnKinds.ts";

const NON_NULLABLE_COLUMNS = new Set(["free_comment", "onagre_demande_identifier", "enjeu"]);
const TYPE_DOSSIER_VALUES = new Set(["Hirondelle", "Cigogne"]);
const MAIN_ACTIVITE_VALUES = new Set<string>(dossierMainActiviteOptions);
const MOTIF_DEROGATION_VALUES = new Set<string>(motifDerogationOptions);
const SCIENTIFIQUE_DEMANDE_TYPE_VALUES = new Set<string>(scientifiqueDemandeTypeOptions);
const SCIENTIFIQUE_DEMANDE_PURPOSE_VALUES = new Set<string>(scientifiqueDemandePurposeOptions);
const DEPARTEMENT_VALUES = new Set<string>(departements.map(({ code }) => code));
const REGION_VALUES = new Set<string>(dossierRegionOptions);
const LOCATION_SCOPE_VALUES = new Set<string>(dossierLocationScopeOptions);

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
  if (column === "motif_derogation" && !MOTIF_DEROGATION_VALUES.has(raw)) {
    error(400, `Property 'motif_derogation' is invalid.`);
  }
  if (column === "location_scope" && !LOCATION_SCOPE_VALUES.has(raw)) {
    error(400, `Property 'location_scope' is invalid.`);
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
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      error(400, `Property 'projet_map' must be a GeoJSON object.`);
    }
    const geoJson = raw as Record<string, unknown>;
    if (geoJson.type !== "FeatureCollection" || !Array.isArray(geoJson.features)) {
      error(400, `Property 'projet_map' must be a GeoJSON FeatureCollection.`);
    }
  }
  return JSON.stringify(raw);
}

function parseColumnValue(column: string, kind: ColumnKind, raw: unknown): unknown {
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
