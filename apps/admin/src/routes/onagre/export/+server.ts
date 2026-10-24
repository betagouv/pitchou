import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import type { RequestHandler } from "./$types";
export const GET: RequestHandler = async () => {
  const [mappings, revisions, snapshots] = await Promise.all([
    db("onagre_mapping").select("*"),
    db("onagre_mapping_revision").select("*"),
    db("onagre_snapshot").select(
      "id",
      "fingerprint",
      "filename",
      "workbook_fingerprint",
      "created_at",
    ),
  ]);
  return new Response(
    JSON.stringify(
      {
        format: "pitchou-onagre-decisions-v1",
        exportedAt: new Date().toISOString(),
        mappings,
        revisions,
        snapshots,
      },
      null,
      2,
    ),
    {
      headers: {
        "content-type": "application/json",
        "content-disposition": 'attachment; filename="onagre-correspondances.json"',
        "cache-control": "no-store",
      },
    },
  );
};
