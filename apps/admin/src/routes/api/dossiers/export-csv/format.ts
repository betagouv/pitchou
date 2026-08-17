import type { AdminDossierExportRow } from "@pitchou/server/database/dossier_admin_list.ts";

const HEADER = [
  "Identifiant Pitchou",
  "Nom du dossier",
  "Numéro Démarches Numériques",
  "Source",
  "Date de dépôt",
  "Phase",
  "Demandeur",
  "Groupe instructeurs",
  "Activité principale",
  "Département principal",
  "Départements",
  "Communes",
  "Régions",
];

const SOURCE_LABELS = {
  pitchou: "Créé dans Pitchou",
  demarche_numerique: "Importé de Démarches Numériques",
  unknown: "Source inconnue",
};

function csvEscape(value: string | number): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** ISO day, so spreadsheets sort the column chronologically whatever their locale. */
function formatDate(value: Date | string): string {
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

export function dossiersExportToCSV(rows: AdminDossierExportRow[]): string {
  const lines = rows.map((row) =>
    [
      row.id,
      row.name ?? "",
      row.demarche_numerique_number ?? "",
      SOURCE_LABELS[row.source] ?? SOURCE_LABELS.unknown,
      formatDate(row.depot_date),
      row.phase,
      formatDemandeur(row),
      row.groupe_name ?? "",
      row.main_activite ?? "",
      row.primary_department ?? "",
      formatStringList(row.departments),
      formatCommunes(row.communes),
      formatStringList(row.regions),
    ]
      .map(csvEscape)
      .join(","),
  );
  return [HEADER.join(","), ...lines].join("\n");
}
