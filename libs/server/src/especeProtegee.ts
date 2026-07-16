import type { Knex } from "knex";

// Relative imports (not the `$` aliases) so this module also resolves under `tsx`,
// which runs the CLI generator and the seeds.
import { directDatabaseConnection } from "./database.ts";

import type { default as EspeceProtegee } from "@pitchou/types/database/public/EspeceProtegee.ts";
import type { ProtectionDocument, StatutProtection } from "@pitchou/types/especes.d.ts";
import type {
  default as EspeceProtegeeModification,
  EspeceProtegeeModificationInitializer,
  EspeceProtegeeModificationCdRef,
} from "@pitchou/types/database/public/EspeceProtegeeModification.ts";

// Re-exported so server consumers can convert rows from the same module they fetch
// them with. The implementation is knex-free and lives in `commun` so the front-end
// can reuse it on rows received from the API.
export { dbRowToEspeceProtegee } from "@pitchou/common/especesUtils.ts";

export type EspeceProtegeeAvecStatutsProtection = EspeceProtegee & {
  statuts_protection: StatutProtection[];
};

/**
 * Reads the merged `espece_protegee` view (reference table + manual layer fused by
 * SQL) and normalizes the row shape. This is what every public consumer
 * (`/api/especes-protegees`, geomce…) sees.
 */
export async function getEspecesProtegees(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<EspeceProtegeeAvecStatutsProtection[]> {
  const rows = (await databaseConnection<EspeceProtegee>("espece_protegee").select("*")).map(
    normaliserLigneVue,
  );
  const documentsByCdRef = await getDocumentsProtectionByCdRef(
    rows.map((row) => row.cd_ref),
    databaseConnection,
  );
  return rows.map((row) => ({
    ...row,
    statuts_protection: row.cd_type_statuts.map((cd_type_statut) => ({
      cd_type_statut: cd_type_statut as StatutProtection["cd_type_statut"],
      documents: documentsByCdRef.get(row.cd_ref)?.get(cd_type_statut) ?? [],
    })),
  }));
}

/**
 * Normalizes a row read from the `espece_protegee` view. Kanel infers the view
 * columns as non-null, but a view offers no constraints, so we coerce to the defaults
 * the app expects (`[]`, `false`) — consumers always get the effective, non-null shape.
 */
function normaliserLigneVue(row: EspeceProtegee): EspeceProtegee {
  return {
    cd_ref: row.cd_ref,
    classification: row.classification,
    noms_scientifiques: row.noms_scientifiques ?? [],
    noms_vernaculaires: row.noms_vernaculaires ?? [],
    cd_type_statuts: row.cd_type_statuts ?? [],
    espece_ministerielle: row.espece_ministerielle ?? false,
    espece_cnpn: row.espece_cnpn ?? false,
  };
}

type BdcDocumentRow = {
  cd_ref: string;
  cd_type_statut: string;
  cd_doc: string;
  full_citation: string;
  doc_url: string;
};

async function getDocumentsProtectionByCdRef(
  cdRefs: string[],
  databaseConnection: Knex.Transaction | Knex,
): Promise<Map<string, Map<string, ProtectionDocument[]>>> {
  if (cdRefs.length === 0) return new Map();

  const rows: BdcDocumentRow[] = await databaseConnection("espece_bdc_statut")
    .select("cd_ref", "cd_type_statut", "cd_doc", "full_citation", "doc_url")
    .whereIn("cd_ref", cdRefs)
    .whereNot("doc_url", "")
    .orderBy(["cd_ref", "cd_type_statut", "cd_doc", "doc_url"]);

  const result = new Map<string, Map<string, ProtectionDocument[]>>();
  const seen = new Set<string>();
  for (const row of rows) {
    const key = [row.cd_ref, row.cd_type_statut, row.cd_doc, row.doc_url].join("|");
    if (seen.has(key)) continue;
    seen.add(key);

    const byStatut = result.get(row.cd_ref) ?? new Map<string, ProtectionDocument[]>();
    const documents = byStatut.get(row.cd_type_statut) ?? [];
    documents.push({
      cd_doc: row.cd_doc,
      full_citation: row.full_citation,
      doc_url: row.doc_url,
    });
    byStatut.set(row.cd_type_statut, documents);
    result.set(row.cd_ref, byStatut);
  }
  return result;
}

/** Returns the raw manual-layer rows (overrides, additions, exclusions). */
export function getEspecesProtegeesModifications(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<EspeceProtegeeModification[]> {
  return databaseConnection("espece_protegee_modification").select("*");
}

export type EspeceProtegeeModificationAdmin = EspeceProtegeeModification & {
  reference_noms_scientifiques: string[] | null;
  reference_classification: string | null;
  reference_cd_type_statuts: string[] | null;
  reference_noms_vernaculaires: string[] | null;
};

/**
 * Lists every manual modification with its reference context, most recently
 * updated first.
 */
export function listEspeceProtegeeModifications(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<EspeceProtegeeModificationAdmin[]> {
  return databaseConnection("espece_protegee_modification as m")
    .leftJoin("espece_protegee_reference as r", "m.cd_ref", "r.cd_ref")
    .select(
      "m.*",
      databaseConnection.raw("r.noms_scientifiques as reference_noms_scientifiques"),
      databaseConnection.raw("r.classification as reference_classification"),
      databaseConnection.raw("r.cd_type_statuts as reference_cd_type_statuts"),
      databaseConnection.raw("r.noms_vernaculaires as reference_noms_vernaculaires"),
    )
    .orderBy("m.updated_at", "desc");
}

const VALID_CLASSIFICATIONS: ReadonlySet<string> = new Set(["oiseau", "faune non-oiseau", "flore"]);

const VALID_STATUTS: ReadonlySet<string> = new Set(["PN", "PR", "PD", "POM", "Espèce manquante"]);

export type PatchModification = {
  classification?: string | null;
  noms_scientifiques?: string[] | null;
  noms_vernaculaires?: string[] | null;
  cd_type_statuts?: string[] | null;
  espece_ministerielle?: boolean | null;
  espece_cnpn?: boolean | null;
  exclu?: boolean;
};

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((e) => typeof e === "string");
}

/**
 * Validates a patch received from the client
 */
export function validatePatchModification(
  patch: unknown,
): { ok: true; value: PatchModification } | { ok: false; message: string } {
  if (typeof patch !== "object" || patch === null || Array.isArray(patch)) {
    return { ok: false, message: "Le patch doit être un objet." };
  }
  const p = patch as Record<string, unknown>;

  if ("classification" in p && p.classification !== null) {
    if (typeof p.classification !== "string" || !VALID_CLASSIFICATIONS.has(p.classification)) {
      return {
        ok: false,
        message: `classification invalide : ${JSON.stringify(p.classification)}`,
      };
    }
  }

  if (
    "noms_scientifiques" in p &&
    p.noms_scientifiques !== null &&
    !isStringArray(p.noms_scientifiques)
  ) {
    return { ok: false, message: "noms_scientifiques doit être un tableau de chaînes ou null." };
  }

  if (
    "noms_vernaculaires" in p &&
    p.noms_vernaculaires !== null &&
    !isStringArray(p.noms_vernaculaires)
  ) {
    return { ok: false, message: "noms_vernaculaires doit être un tableau de chaînes ou null." };
  }

  if ("cd_type_statuts" in p && p.cd_type_statuts !== null) {
    if (
      !isStringArray(p.cd_type_statuts) ||
      !p.cd_type_statuts.every((s) => VALID_STATUTS.has(s))
    ) {
      return { ok: false, message: "cd_type_statuts contient une valeur invalide." };
    }
  }

  for (const field of ["espece_ministerielle", "espece_cnpn"] as const) {
    if (field in p && p[field] !== null && typeof p[field] !== "boolean") {
      return { ok: false, message: `${field} doit être un booléen ou null.` };
    }
  }

  if ("exclu" in p && typeof p.exclu !== "boolean") {
    return { ok: false, message: "exclu doit être un booléen." };
  }

  return { ok: true, value: p as PatchModification };
}

/**
 * Only the keys present are written; the others keep their current value
 */
export async function upsertEspeceProtegeeModification(
  cd_ref: EspeceProtegeeModificationCdRef | string,
  patch: Omit<EspeceProtegeeModificationInitializer, "cd_ref">,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  await databaseConnection("espece_protegee_modification")
    .insert({
      ...patch,
      cd_ref: cd_ref as EspeceProtegeeModificationCdRef,
    })
    .onConflict("cd_ref")
    .merge({ ...patch, updated_at: databaseConnection.fn.now() });
}

/** Removes a manual modification entirely, reverting the `cd_ref` to the reference. */
export async function deleteEspeceProtegeeModification(
  cd_ref: EspeceProtegeeModificationCdRef | string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  await databaseConnection("espece_protegee_modification").where({ cd_ref }).delete();
}
