import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { readDocumentSheets } from "@pitchou/common/onagre/documents.ts";
import { storeDocument, type PreparedDocument } from "@pitchou/server/onagre/documents.ts";
import type { SourceReview } from "@pitchou/types/onagreDocuments.ts";

if (!["localhost", "127.0.0.1", "::1"].includes(new URL(process.env.DATABASE_URL!).hostname))
  throw new Error("Use a local preparation database.");
const [directory, mode] = process.argv.slice(2);
if (!directory || (mode && mode !== "--apply"))
  throw new Error("Usage: load-documents.ts SOURCE_DIRECTORY [--apply]");
type ReviewedSource = SourceReview & { fingerprint: string };
const reviews: ReviewedSource[] = JSON.parse(
  await readFile(new URL("./source-review.json", import.meta.url), "utf8"),
);
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const types: Record<string, string> = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  csv: "text/csv",
  md: "text/markdown",
};
async function prepareDocument(
  review: ReviewedSource,
  snapshotId: number,
): Promise<PreparedDocument> {
  const path = join(directory, review.filename),
    bytes = await readFile(path);
  if (hash(bytes) !== review.fingerprint)
    throw new Error(
      `File changed since review: ${review.filename}. Review its contents before loading it.`,
    );
  const extension = review.filename.split(".").at(-1)!;
  const text =
    extension === "pdf"
      ? (
          await promisify(execFile)("pdftotext", ["-layout", path, "-"], {
            maxBuffer: 8 * 1024 * 1024,
          })
        ).stdout
      : extension === "md"
        ? bytes.toString("utf8")
        : null;
  return {
    filename: review.filename,
    fingerprint: hash(bytes),
    size: bytes.length,
    mime: types[extension] ?? "application/octet-stream",
    review,
    snapshot_id: snapshotId,
    original: review.storeOriginal ? bytes : null,
    text,
    sheets:
      review.storeOriginal && ["xlsx", "ods", "csv"].includes(extension)
        ? readDocumentSheets(review.filename, bytes)
        : [],
  };
}
try {
  const files = await readdir(directory);
  if (
    files.length !== reviews.length ||
    files.some((name) => !reviews.some((review) => review.filename === name))
  )
    throw new Error(
      "Source folder differs from the reviewed inventory. Review new or missing files first.",
    );
  const dump = await readFile(join(directory, "postgresql_database-onagre-lastbackup(6)"));
  const snapshot = await db("onagre_snapshot")
    .where({ fingerprint: hash(dump) })
    .first("id");
  if (!snapshot)
    throw new Error("Load the matching dump before registering its supporting documents.");
  const documents: PreparedDocument[] = [];
  for (const review of reviews) documents.push(await prepareDocument(review, snapshot.id));
  if (mode) {
    const created = await db.transaction(async (trx) => {
      let count = 0;
      for (const document of documents) if ((await storeDocument(trx, document)).created) count++;
      return count;
    });
    console.log(JSON.stringify({ created, unchanged: documents.length - created }));
  } else
    console.log(
      JSON.stringify({
        mode: "preview",
        documents: documents.map((d) => ({
          filename: d.filename,
          original: !!d.original,
          sheets: d.sheets.map((s) => ({ name: s.name, rows: s.rows.length })),
          textCharacters: d.text?.length ?? 0,
        })),
      }),
    );
} finally {
  await db.destroy();
}
