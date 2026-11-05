import { initialize } from "../local-import/connection.mjs";
import { batches } from "./batches.mjs";
import { restoreReferences } from "./references.mjs";
import { getReviewer } from "../local-import/routing.mjs";

export async function run({ client, objects, bundle, sha256, reviewerEmail, apply, limit }) {
  const report = {
    mode: apply ? "apply" : "dry-run",
    bundleSha256: sha256,
    reviewedThrough: bundle.reviewedThrough,
    startedAt: new Date().toISOString(),
    projects: 0,
    demandes: 0,
    resumed: 0,
    created: 0,
    updated: 0,
    preservedEdits: 0,
    failures: [],
    batches: 0,
  };
  await client.begin();
  await initialize(client, "staging");
  await getReviewer(client, reviewerEmail);
  report.references = await restoreReferences(client, bundle.references);
  await client.query(`CREATE TABLE IF NOT EXISTS onagre_local_import.staging_progress (
    bundle_sha256 text NOT NULL, project_key text NOT NULL, completed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (bundle_sha256, project_key)
  )`);
  const done = new Set(
    (
      await client.query(
        "SELECT project_key FROM onagre_local_import.staging_progress WHERE bundle_sha256=$1",
        [sha256],
      )
    ).rows.map((row) => row.project_key),
  );
  if (apply) await client.finish(true);
  let seen = 0;
  const queue = [];
  const flush = batches({ client, objects, sha256, reviewerEmail, apply, report });
  try {
    for await (const entry of bundle.projects()) {
      if (limit && seen++ >= limit) break;
      if (apply && done.has(entry.project.identity.key)) {
        report.resumed++;
        continue;
      }
      queue.push(entry);
      if (queue.length === 20) await flush(queue.splice(0));
    }
    await flush(queue.splice(0));
    await client.finish(false);
    report.finishedAt = new Date().toISOString();
    await objects.report(sha256, report);
    console.log(JSON.stringify(report));
    if (report.failures.length > 0)
      throw new Error(
        `${report.failures.length} projects require reconciliation; see retained staging report`,
      );
  } catch (error) {
    await client.finish(false);
    report.error = error.message;
    await objects.report(sha256, report);
    throw error;
  }
}
