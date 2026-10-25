import type { Knex } from "knex";
import type {
  DocumentSheet,
  OnagreDocument,
  SourceReview,
} from "@pitchou/types/onagreDocuments.ts";
import { escapePattern } from "./filters.ts";

export type PreparedDocument = {
  filename: string;
  fingerprint: string;
  size: number;
  mime: string;
  review: SourceReview;
  snapshot_id: number;
  original: Buffer | null;
  text: string | null;
  sheets: {
    index: number;
    name: string;
    columns: string[];
    rows: { row_number: number; cells: string[] }[];
  }[];
};
export async function storeDocument(trx: Knex.Transaction, document: PreparedDocument) {
  const { sheets, ...record } = document;
  const [created] = await trx("onagre_document")
    .insert({ ...record, review: JSON.stringify(record.review) })
    .onConflict(["filename", "fingerprint"])
    .ignore()
    .returning("id");
  if (!created) return { created: false };
  for (const sheet of sheets) {
    await trx("onagre_document_sheet").insert({
      document_id: created.id,
      sheet_index: sheet.index,
      name: sheet.name,
      row_count: sheet.rows.length,
      columns: JSON.stringify(sheet.columns),
    });
    for (let offset = 0; offset < sheet.rows.length; offset += 500) {
      await trx("onagre_document_row").insert(
        sheet.rows.slice(offset, offset + 500).map((row) => ({
          document_id: created.id,
          sheet_index: sheet.index,
          row_number: row.row_number,
          cells: JSON.stringify(row.cells),
        })),
      );
    }
  }
  return { created: true };
}
export async function listDocuments(connection: Knex): Promise<OnagreDocument[]> {
  return connection("onagre_document")
    .select(
      "id",
      "filename",
      "fingerprint",
      "size",
      "mime",
      "review",
      "snapshot_id",
      "created_at",
      connection.raw("original is not null as has_original"),
    )
    .orderBy(["filename", { column: "id", order: "desc" }]);
}
export async function browseDocument(connection: Knex, url: URL) {
  const documentId = Number(url.searchParams.get("document"));
  if (!Number.isSafeInteger(documentId) || documentId < 1) return null;
  const document = await connection("onagre_document")
    .where({ id: documentId })
    .first("id", "text");
  if (!document) return null;
  const sheets = await connection<DocumentSheet>("onagre_document_sheet")
    .where({ document_id: documentId })
    .orderBy("sheet_index");
  const sheet =
    sheets.find((s) => String(s.sheet_index) === url.searchParams.get("sheet")) ?? sheets[0];
  const search = (url.searchParams.get("sourceSearch") ?? "").slice(0, 200);
  if (!sheet)
    return {
      id: documentId,
      text: document.text as string | null,
      sheets,
      sheet: null,
      rows: [],
      total: 0,
      page: 1,
      pages: 1,
      search,
    };
  const query = connection("onagre_document_row").where({
    document_id: documentId,
    sheet_index: sheet.sheet_index,
  });
  if (search)
    query.whereRaw(
      "exists (select 1 from jsonb_array_elements_text(cells) cell where cell ilike ?)",
      [`%${escapePattern(search)}%`],
    );
  const total = search
    ? Number((await query.clone().count("* as count"))[0].count)
    : sheet.row_count;
  const pages = Math.max(1, Math.ceil(total / 25));
  const page = Math.min(
    pages,
    Math.max(1, Math.floor(Number(url.searchParams.get("sourcePage"))) || 1),
  );
  const rows: { row_number: number; cells: string[] }[] = await query
    .select("row_number", "cells")
    .orderBy("row_number")
    .offset((page - 1) * 25)
    .limit(25);
  return {
    id: documentId,
    text: document.text as string | null,
    sheets,
    sheet,
    rows,
    total,
    page,
    pages,
    search,
  };
}
