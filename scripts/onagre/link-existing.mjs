import { readFile, writeFile } from "node:fs/promises";
import { connect, initialize } from "./local-import/connection.mjs";
import { assertIgnoredFile } from "./local-import/files.mjs";
import { linkExistingDemandes } from "./local-import/link-existing.mjs";
import { recordExcludedCandidates } from "./local-import/exclusions.mjs";

const args = process.argv.slice(2);
const apply = args[0] === "--apply";
if (apply) args.shift();
const [reviewer, planPath, reportPath, ...extra] = args;
if (!reviewer?.includes("@") || !planPath || !reportPath || extra.length > 0)
  throw new Error(
    "Usage: node --env-file=.env --import tsx scripts/onagre/link-existing.mjs [--apply] reviewer@email private-plan.json private-report.json",
  );
for (const path of [planPath, reportPath]) assertIgnoredFile(path);
const plan = JSON.parse(await readFile(planPath, "utf8"));
if (plan.formatVersion !== 1 || !Array.isArray(plan.entries) || plan.entries.length === 0)
  throw new Error("Expected a nonempty version 1 reconciliation plan");
const entries = [];
for (const decision of plan.entries) {
  assertIgnoredFile(decision.projectPath);
  entries.push({ decision, project: JSON.parse(await readFile(decision.projectPath, "utf8")) });
}
const client = await connect(process.env);
let committed = false;
try {
  await client.begin();
  await initialize(client);
  const exclusionPlan = entries.every((e) => e.decision.action === "exclude_candidate");
  if (!exclusionPlan && entries.some((e) => e.decision.action !== "link_existing_demande"))
    throw new Error("Use separate plans for negative reviews and existing-record links");
  const results = await (exclusionPlan
    ? recordExcludedCandidates(client, entries, reviewer)
    : linkExistingDemandes(client, entries, reviewer));
  await client.finish(apply);
  committed = apply;
  await writeFile(
    reportPath,
    JSON.stringify({ applied: apply, checkedAt: new Date().toISOString(), results }, null, 2) +
      "\n",
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      applied: apply,
      linked: results.filter((r) => r.status === "linked").length,
      excluded: results.filter((r) => r.status === "excluded").length,
      unchanged: results.filter((r) => r.status === "unchanged").length,
    }),
  );
} catch (error) {
  if (!committed) await client.finish(false);
  console.error(
    committed
      ? "Reconciliation decisions committed, but writing the report failed. Replay the exact plan to regenerate it; the database ledger is authoritative."
      : error.code
        ? `Database error ${error.code}. Transaction rolled back.`
        : error.message,
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
