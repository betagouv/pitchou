import { initialize } from "../local-import/connection.mjs";
import { importSamples } from "../local-import/run.mjs";

export function batches({ client, objects, sha256, reviewerEmail, apply, report }) {
  async function batch(items) {
    if (apply) {
      await client.begin();
      await initialize(client, "staging");
    }
    try {
      const files = [];
      const results = await importSamples(
        client,
        items.map((entry) => entry.project),
        reviewerEmail,
        { files },
      );
      if (apply) {
        // A failed DB commit can only leave immutable, unreferenced generated objects.
        await objects.upload(files);
        for (const entry of items)
          await client.query(
            "INSERT INTO onagre_local_import.staging_progress(bundle_sha256,project_key) VALUES ($1,$2) ON CONFLICT DO NOTHING",
            [sha256, entry.project.identity.key],
          );
        await client.finish(true);
      }
      report.projects += items.length;
      report.demandes += results.length;
      for (const result of results)
        for (const outcome of result.outcomes) {
          if (outcome.status === "created") report.created++;
          if (outcome.status === "updated") report.updated++;
          report.preservedEdits += outcome.preserved.length;
        }
      report.batches++;
    } catch (error) {
      if (apply) await client.finish(false);
      throw error;
    }
  }
  return async function flush(items) {
    if (items.length === 0) return;
    try {
      await batch(items);
    } catch (error) {
      if (!apply) throw error;
      for (const entry of items) {
        try {
          await batch([entry]);
        } catch (error) {
          report.failures.push({
            projectKey: entry.project.identity.key,
            message: error.message,
            code: error.code,
          });
        }
      }
    }
    console.log(JSON.stringify(report));
    await objects.report(sha256, report);
  };
}
