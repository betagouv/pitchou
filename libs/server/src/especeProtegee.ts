import type { Knex } from "knex";

// Relative imports (not the `$` aliases) so this module also resolves under `tsx`,
// which runs the CLI generator and the seeds.
import { directDatabaseConnection } from "./database.ts";

import type { default as EspeceProtegee } from "@pitchou/types/database/public/EspeceProtegee.ts";
import type { ProtectionDocument, StatutProtection } from "@pitchou/types/especes.d.ts";

// Re-exported so server consumers can convert rows from the same module they fetch
// them with. The implementation is knex-free and lives in `commun` so the front-end
// can reuse it on rows received from the API.
export { dbRowToEspeceProtegee } from "@pitchou/common/especesUtils.ts";
export {
  deleteEspeceProtegeeModification,
  getEspecesProtegeesModifications,
  listEspeceProtegeeModifications,
  upsertEspeceProtegeeModification,
  validatePatchModification,
} from "./especeProtegeeModification.ts";
export type {
  EspeceProtegeeModificationAdmin,
  PatchModification,
} from "./especeProtegeeModification.ts";

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
    normalizeViewRow,
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
function normalizeViewRow(row: EspeceProtegee): EspeceProtegee {
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
