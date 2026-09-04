import {
  createWorkbook,
  type WorkbookCell,
  type WorkbookSheet,
} from "@pitchou/common/createWorkbook.ts";
import type {
  AdminAvisExpertExportRow,
  AdminDossierExportRow,
} from "@pitchou/server/database/dossier_admin_list.ts";

const DOSSIERS_HEADER = [
  "Identifiant Pitchou",
  "Nom du dossier",
  "Numéro Démarches Numériques",
  "Source",
  "Date de dépôt",
  "Phase",
  "Date de la phase",
  "Demandeur",
  "Groupe instructeurs",
  "Activité principale",
  "Département principal",
  "Départements",
  "Communes",
  "Régions",
];

const AVIS_EXPERT_HEADER = [
  "Identifiant Pitchou",
  "Expert",
  "Date de saisine",
  "Fichier de saisine",
  "Avis",
  "Date de l'avis",
  "Fichier de l'avis",
];

const SOURCE_LABELS = {
  pitchou: "Créé dans Pitchou",
  demarche_numerique: "Importé de Démarches Numériques",
  unknown: "Source inconnue",
};

/** ISO day, so spreadsheets sort the column chronologically whatever their locale. */
function formatDate(value: Date | string | null): string {
  if (value === null) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
}

function formatDemandeur(row: AdminDossierExportRow): string {
  if (row.demandeur_entreprise) return row.demandeur_entreprise;
  return [row.demandeur_last_name, row.demandeur_first_names].filter(Boolean).join(" ");
}

/** Joins a jsonb string list (departments, regions) into one cell. */
function formatStringList(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value.filter((item): item is string => typeof item === "string").join(" ; ");
}

/** Joins the jsonb commune objects into one cell, as "name (code)". */
function formatCommunes(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .filter(
      (commune): commune is Record<string, unknown> => !!commune && typeof commune === "object",
    )
    .map((commune) => {
      const name = typeof commune.name === "string" ? commune.name : "";
      const code = typeof commune.code === "string" ? commune.code : "";
      if (name && code) return `${name} (${code})`;
      return name || code;
    })
    .filter(Boolean)
    .join(" ; ");
}

export function dossiersSheetRows(rows: AdminDossierExportRow[]): WorkbookCell[][] {
  return [
    DOSSIERS_HEADER,
    ...rows.map((row) => [
      row.id,
      row.name ?? "",
      row.demarche_numerique_number ?? "",
      SOURCE_LABELS[row.source] ?? SOURCE_LABELS.unknown,
      formatDate(row.depot_date),
      row.phase ?? "",
      formatDate(row.phase_date),
      formatDemandeur(row),
      row.groupe_name ?? "",
      // The Pitchou activity name; raw labels still pending review come out unchanged
      // (see `withResolvedActivite`).
      row.activite_label ?? "",
      row.primary_department ?? "",
      formatStringList(row.departments),
      formatCommunes(row.communes),
      formatStringList(row.regions),
    ]),
  ];
}

/** The dossier id is the first column, so a reader can relate a row back to the Dossiers sheet. */
export function avisExpertSheetRows(rows: AdminAvisExpertExportRow[]): WorkbookCell[][] {
  return [
    AVIS_EXPERT_HEADER,
    ...rows.map((row) => [
      row.dossier,
      row.expert ?? "",
      formatDate(row.saisine_date),
      row.saisine_fichier ?? "",
      row.avis ?? "",
      formatDate(row.avis_date),
      row.avis_fichier ?? "",
    ]),
  ];
}

export function dossiersExportSheets(
  dossiers: AdminDossierExportRow[],
  avisExpert: AdminAvisExpertExportRow[],
): WorkbookSheet[] {
  return [
    { name: "Dossiers", rows: dossiersSheetRows(dossiers) },
    { name: "Avis experts", rows: avisExpertSheetRows(avisExpert) },
  ];
}

export function dossiersExportToWorkbook(
  dossiers: AdminDossierExportRow[],
  avisExpert: AdminAvisExpertExportRow[],
): ArrayBuffer {
  return createWorkbook(dossiersExportSheets(dossiers, avisExpert));
}
