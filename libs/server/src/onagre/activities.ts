import type { Knex } from "knex";
import type { OnagreMapping } from "@pitchou/types/onagre.ts";
import type { OnagreActivities, ActivityOption } from "@pitchou/types/onagreActivities.ts";
import { ACTIVITY_WORKBOOK_HASH, linkWorksheetRows } from "@pitchou/common/onagre/activities.ts";

export async function loadActivityWorkspace(
  db: Knex,
  mappings: OnagreMapping[],
): Promise<OnagreActivities> {
  const activities = await db<ActivityOption>("activite")
    .select("code", "label", "groupe_code")
    .orderBy("label");
  const document = await db("onagre_document")
    .where({ fingerprint: ACTIVITY_WORKBOOK_HASH })
    .first("id");
  if (!document) return { activities, rows: [], generalNote: "", documentId: null };
  const rows: { row_number: number; cells: string[] }[] = await db("onagre_document_row")
    .where({ document_id: document.id, sheet_index: 0 })
    .orderBy("row_number")
    .select("row_number", "cells");
  return {
    activities,
    rows: linkWorksheetRows(rows, mappings),
    generalNote: rows.find((row) => row.row_number === 1)?.cells[3] ?? "",
    documentId: document.id,
  };
}
