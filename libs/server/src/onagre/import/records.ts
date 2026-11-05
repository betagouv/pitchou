import type { OnagreImportRecord } from "@pitchou/types/onagreImport.ts";
import type { FrozenInput, Source } from "./state.ts";
import type { OnagreMapping } from "@pitchou/types/onagre.ts";
import { planFields } from "./plan.ts";
import { hash, POLICY, receptionDate } from "./policy.ts";
import { recordFingerprint } from "../snapshots.ts";

type Row = Record<string, unknown>;
export type Target = {
  candidates: Row[];
  identity: Row | null;
  dossier: Row | null;
  duplicateSources: number;
};

export function inspectRecord(
  recordId: string,
  source: Source | null,
  target: Target,
  schema: Row[],
  mappings: OnagreMapping[],
  activities: FrozenInput["activities"],
): OnagreImportRecord {
  const code = source?.demande.codedemande?.trim() || null;
  const name = source?.projet.nomprojet?.trim() || null;
  const date = receptionDate(source?.demande.datereception);
  const sourceHash = source
    ? hash({ demande: source.demande, projet: source.projet, references: source.references })
    : null;
  const record: OnagreImportRecord = {
    recordId,
    code,
    name,
    receptionDate: date,
    sourceHash,
    targetHash: hash(target),
    dossierId: null,
    status: "ready",
    issues: [],
    omissions: [...POLICY.omissions],
  };
  if (!source) record.issues.push("Demande absente de ce snapshot.");
  if (!code) record.issues.push("Code de demande manquant.");
  if (!name) record.issues.push("Nom du projet manquant.");
  if (!date)
    record.issues.push(
      "Date de réception absente ou invalide. Format requis AAAA-MM-JJ, sans date de remplacement.",
    );
  if (
    source &&
    (String(source.demande.demandesid) !== recordId ||
      source.projet.projetid !== source.demande.projetid ||
      String(source.projet_id) !== source.demande.projetid ||
      source.fingerprint !== recordFingerprint(source.demande, source.projet))
  )
    record.issues.push("Les identifiants ou l'empreinte de la ligne source sont incohérents.");
  for (const [column, value] of [
    ["name", name],
    ["onagre_demande_identifier", code],
  ] as const) {
    const limit = schema.find((row) => row.column_name === column)?.character_maximum_length;
    if (typeof limit === "number" && value && [...value].length > limit)
      record.issues.push(`Le champ ${column} dépasse la limite de ${limit} caractères en base.`);
  }
  record.issues.push(...unsupportedColumns(schema));
  if (target.duplicateSources > 1)
    record.issues.push("Plusieurs demandes du snapshot portent ce code.");
  planFields(record, source, mappings, activities);
  for (const [column, value] of Object.entries(record.plan?.columns ?? {})) {
    const definition = schema.find((row) => row.column_name === column);
    if (!definition) record.issues.push(`Le champ ${column} est absent du schéma Pitchou.`);
    const limit = definition?.character_maximum_length;
    if (typeof limit === "number" && [...value].length > limit)
      record.issues.push(`Le champ ${column} dépasse la limite de ${limit} caractères en base.`);
  }
  if (record.issues.length > 0) record.status = "blocked";

  inspectIdentity(record, target);
  return record;
}

function unsupportedColumns(schema: Row[]) {
  const supplied = new Set(["id", "name", "depot_date", "source", "onagre_demande_identifier"]);
  return schema
    .filter(
      (column) =>
        column.is_nullable === "NO" &&
        column.column_default === null &&
        !supplied.has(String(column.column_name)),
    )
    .map(
      (column) =>
        `Le champ obligatoire ${column.column_name} n'est pas pris en charge par ce profil.`,
    );
}

function inspectIdentity(record: OnagreImportRecord, target: Target) {
  if (target.identity) {
    const identity = target.identity;
    record.dossierId = Number(identity.dossier_id);
    if (
      identity.source_hash !== record.sourceHash ||
      identity.profile_version !== POLICY.version ||
      hash((identity.raw_source as { plan?: unknown } | undefined)?.plan ?? null) !==
        hash(record.plan ?? null) ||
      !target.dossier ||
      hash(target.dossier) !== identity.target_hash ||
      target.candidates.length !== 1 ||
      target.candidates[0].id !== identity.dossier_id
    ) {
      record.status = "conflict";
      record.issues.push(
        "La source, les transformations, le profil ou le dossier déjà importé a changé. Aucune mise à jour automatique.",
      );
    } else if (record.status === "ready") record.status = "already_imported";
  } else if (target.candidates.length > 0) {
    record.status = "conflict";
    record.issues.push(
      target.candidates.length > 1
        ? "Plusieurs dossiers existants portent ce code Onagre. Rapprochement ambigu bloqué."
        : "Un dossier existant porte ce code Onagre sans registre d'import. Adoption non prise en charge.",
    );
  }
}
