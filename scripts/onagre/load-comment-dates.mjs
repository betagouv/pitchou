import { readFile } from "node:fs/promises";
import { connect } from "./local-import/connection.mjs";
import { assertIgnoredFile } from "./local-import/files.mjs";
import { readCommentDepotDates, writeCommentDepotDates } from "./load-comment-evidence/dates.mjs";
import { loadReviewSummary } from "../../libs/server/src/onagre/reviewSummary.ts";

const args = process.argv.slice(2);
const apply = args[0] === "--apply";
if (apply) args.shift();
const [dumpPath, selectionPath] = args;
if (args.length !== 2)
  throw new Error("Usage: load-comment-dates.mjs [--apply] <dump.sql> <source-selection.json>");
for (const path of args) assertIgnoredFile(path);
const { sourceSha256 } = JSON.parse(await readFile(selectionPath, "utf8"));
if (!/^[0-9a-f]{64}$/u.test(sourceSha256)) throw new Error("Invalid source selection SHA-256");

const client = await connect(process.env);
try {
  await client.begin();
  await client.query("SELECT pg_advisory_xact_lock(10112026, 3)");
  const keys = await client.trx("onagre_comment_evidence").distinct().pluck("demande_key");
  const dates = await readCommentDepotDates(dumpPath, sourceSha256, new Set(keys));
  await writeCommentDepotDates(client.trx, dates);
  const summary = await loadReviewSummary(client.trx);
  await client.finish(apply);
  console.log(
    JSON.stringify({ applied: apply, demandes: dates.length, groups: summary.texts.total }),
  );
} finally {
  await client.end();
}
