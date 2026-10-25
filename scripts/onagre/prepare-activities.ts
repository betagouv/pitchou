import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { loadActivityWorkspace } from "@pitchou/server/onagre/activities.ts";
import type { OnagreMapping } from "@pitchou/types/onagre.ts";

if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(process.env.DATABASE_URL!).hostname))
  throw new Error("Activity preparation requires a local database.");
if (process.argv.slice(2).some((argument) => argument !== "--apply"))
  throw new Error("Usage: prepare-activities.ts [--apply]");
try {
  await db.transaction(async (trx) => {
    await trx.raw("select pg_advisory_xact_lock(2105102026)");
    const mappings = await trx<OnagreMapping>("onagre_mapping").select("*");
    const workspace = await loadActivityWorkspace(trx, mappings);
    if (!workspace.documentId || workspace.rows.length !== 59)
      throw new Error("Load the reviewed 59-row activity worksheet first.");
    const missing = workspace.rows.filter((row) =>
      row.mappingKeys.every((key) => !mappings.some((mapping) => mapping.key === key)),
    );
    console.log(
      JSON.stringify({
        worksheetRows: workspace.rows.length,
        additionalDecisions: missing.map((row) => ({
          row: row.rowNumber,
          label: row.tracking || row.source || row.proposal,
        })),
      }),
    );
    if (!process.argv.includes("--apply")) return;
    for (const row of missing)
      await trx("onagre_mapping")
        .insert({
          key: row.mappingKeys[0],
          section: "objet",
          label: `Classeur · ${row.tracking || row.source || row.proposal}`,
          context: `Ligne ${row.rowNumber} du classeur d'activités. Aucun objet Onagre identifié dans cette ligne.`,
          proposal: row.proposal,
          confidence: "",
          notes: "",
          target: "",
          rule: "",
          status: "discuss",
          version: 1,
        })
        .onConflict("key")
        .ignore();
  });
} finally {
  await db.destroy();
}
