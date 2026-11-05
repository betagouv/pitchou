import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import manifest from "./review-decisions/entries.json" with { type: "json" };
import { applyDecisionReview } from "./review-decisions/apply.ts";
import type { DecisionReview } from "./review-decisions/types.ts";

// This operator command applies the owner's reviewed correspondence batch, never dossier data.
try {
  const url = new URL(process.env.DATABASE_URL!);
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !process.env.ONAGRE_EXPECTED_DATABASE ||
    decodeURIComponent(url.pathname.slice(1)) !== process.env.ONAGRE_EXPECTED_DATABASE
  )
    throw new Error("Set ONAGRE_EXPECTED_DATABASE to the explicit local preparation database name");
  const [mode, email, extra] = process.argv.slice(2);
  if (extra || (mode && mode !== "--apply") || (mode === "--apply" && !email))
    throw new Error("Usage: review-decisions.ts [--apply existing-actor-email]");
  const identity = await db.raw("select current_database() as name");
  if (identity.rows[0].name !== process.env.ONAGRE_EXPECTED_DATABASE)
    throw new Error("Connected database differs from the expected target");
  const actor = mode ? await db("auth_user").where({ email, active: true }).first("id") : undefined;
  if (mode && !actor) throw new Error("An existing active revision actor is required");
  const result = await db.transaction((trx) =>
    applyDecisionReview(trx, manifest as DecisionReview, actor?.id),
  );
  const changed = manifest.entries.filter((entry) => result.changed.includes(entry.key));
  const counts = await db("onagre_mapping").select("status").count("* as count").groupBy("status");
  console.log(
    JSON.stringify(
      {
        mode: mode ? "applied" : "preview",
        changed: result.changed.length,
        unchanged: result.unchanged.length,
        skipped: result.skipped,
        transitions: changed.reduce<Record<string, number>>((totals, entry) => {
          const transition = `${entry.expected.status} -> ${entry.decision.status}`;
          totals[transition] = (totals[transition] ?? 0) + 1;
          return totals;
        }, {}),
        currentCounts: counts,
      },
      null,
      2,
    ),
  );
} finally {
  await db.destroy();
}
