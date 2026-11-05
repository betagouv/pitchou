import type { Knex } from "knex";
import type { OnagreMapping } from "@pitchou/types/onagre.ts";
import { originalContexts, originalWorkbook } from "@pitchou/common/onagre/originalWorkbook.ts";

export async function loadMappings(connection: Knex): Promise<OnagreMapping[]> {
  const mappings = await connection<OnagreMapping>("onagre_mapping")
    .select("*")
    .orderBy(["section", "key"]);
  const knownWorkbook = await connection("onagre_snapshot")
    .where({ workbook_fingerprint: originalWorkbook.fingerprint })
    .first("id");
  if (!knownWorkbook) return mappings;
  return mappings.map((mapping) => {
    const original = originalContexts[mapping.key];
    return original ? { ...mapping, originalWorkbook: original } : mapping;
  });
}
