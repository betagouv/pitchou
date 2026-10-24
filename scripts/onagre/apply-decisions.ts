import { readFile } from "node:fs/promises";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { applyReviewedDecisions, type ReviewedDecision } from "./reviewedDecisions.ts";

// The reviewed workbook and this execution are local preparation data, never a dossier import.
const url = new URL(process.env.DATABASE_URL!);
if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname))
  throw new Error("Use a local preparation database.");
const [mode, email] = process.argv.slice(2);
if (mode && mode !== "--apply") throw new Error("Usage: apply-decisions.ts [--apply actor-email]");
const manifest = JSON.parse(
  await readFile(new URL("./reviewed-decisions.json", import.meta.url), "utf8"),
) as {
  format: string;
  entries: ReviewedDecision[];
};
if (manifest.format !== "pitchou-onagre-reviewed-decisions-v1" || !Array.isArray(manifest.entries))
  throw new Error("Invalid reviewed decisions manifest.");
try {
  let actorId: number | undefined;
  if (mode === "--apply") {
    if (!email) throw new Error("An existing active actor email is required for revision history.");
    const actor = await db("auth_user").where({ email, active: true }).first("id");
    if (!actor) throw new Error("Active actor not found.");
    actorId = actor.id;
  }
  const result = await db.transaction((trx) =>
    applyReviewedDecisions(trx, manifest.entries, actorId),
  );
  console.log(JSON.stringify({ mode: mode ? "applied" : "preview", ...result }));
} finally {
  await db.destroy();
}
