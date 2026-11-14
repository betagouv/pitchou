import { readFile, writeFile } from "node:fs/promises";
import { connect, initialize } from "./local-import/connection.mjs";
import { importSamples } from "./local-import/run.mjs";
import { assertIgnoredFile } from "./local-import/files.mjs";
import { uploadSpeciesFiles } from "./local-import/species.mjs";
const args = process.argv.slice(2),
  apply = args[0] === "--apply";
if (apply) args.shift();
const [reviewerEmail, ...files] = args;
if (
  !reviewerEmail?.includes("@") ||
  files.length === 0 ||
  files.some((file) => file.startsWith("--"))
) {
  console.error(
    "Usage: node --env-file=.env --import tsx scripts/onagre/local-import.mjs [--apply] reviewer@email projet.json ...",
  );
  process.exit(1);
}
for (const file of files) assertIgnoredFile(file);
if (process.env.ONAGRE_LOCAL_REPORT) assertIgnoredFile(process.env.ONAGRE_LOCAL_REPORT);
const samples = await Promise.all(
  files.map(async (file) => JSON.parse(await readFile(file, "utf8"))),
);
const client = await connect(process.env);
let committed = false;
try {
  await client.begin();
  await initialize(client);
  const generatedFiles = [];
  const dossiers = await importSamples(client, samples, reviewerEmail, { files: generatedFiles });
  // Immutable, content-addressed file identities make a failed DB commit safe to retry.
  if (apply) await uploadSpeciesFiles(generatedFiles, process.env);
  await client.finish(apply);
  committed = apply;
  const report = { applied: apply, checkedAt: new Date().toISOString(), dossiers };
  if (process.env.ONAGRE_LOCAL_REPORT)
    await writeFile(process.env.ONAGRE_LOCAL_REPORT, JSON.stringify(report, null, 2) + "\n", {
      mode: 0o600,
    });
  console.log(
    JSON.stringify(
      {
        applied: apply,
        dossiers: dossiers.map(
          ({
            sourceKey,
            dossierId,
            projectId,
            projectKey,
            reconciliation,
            outcomes,
            retainedRemovedRecords,
          }) => ({
            sourceKey,
            dossierId,
            projectKey,
            projectId,
            reconciliation,
            created: outcomes.filter((o) => o.status === "created").length,
            updated: outcomes.filter((o) => o.status === "updated").length,
            preservedLocalEdits: outcomes.flatMap((o) => o.preserved),
            retainedRemovedRecords,
          }),
        ),
      },
      null,
      2,
    ),
  );
} catch (error) {
  if (!committed) await client.finish(false);
  if (error.reconciliation && process.env.ONAGRE_LOCAL_REPORT)
    await writeFile(
      process.env.ONAGRE_LOCAL_REPORT,
      JSON.stringify(
        {
          applied: false,
          status: "reconciliation_required",
          projects: error.reconciliation,
        },
        null,
        2,
      ) + "\n",
      { mode: 0o600 },
    );
  console.error(
    committed
      ? "Import committed, but writing the local report failed. Re-running is safe; the database identity records are authoritative."
      : error.code
        ? `Database error ${error.code}. Transaction rolled back.`
        : error.message,
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
