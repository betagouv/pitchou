import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import type { RequestHandler } from "./$types";
export const GET: RequestHandler = async () => {
  const [mappings, revisions, snapshots, sharedRules, sharedRuleRevisions] = await Promise.all([
    db("onagre_mapping").select("*"),
    db("onagre_mapping_revision").select("*"),
    db("onagre_snapshot").select(
      "id",
      "fingerprint",
      "filename",
      "workbook_fingerprint",
      "created_at",
    ),
    db("onagre_shared_rule").select("*"),
    db("onagre_shared_rule_revision").select("*"),
  ]);
  return new Response(
    JSON.stringify(
      {
        format: "pitchou-onagre-decisions-v1",
        exportedAt: new Date().toISOString(),
        mappings,
        revisions,
        snapshots,
        sharedRules,
        sharedRuleRevisions,
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
