import { writeBundle } from "./staging-import/writer.mjs";
import { assertIgnoredFile } from "./local-import/files.mjs";

const [projectsDirectory, output, reviewedThrough, parts = "1", ...extra] = process.argv.slice(2);
if (
  !projectsDirectory ||
  !output ||
  !reviewedThrough ||
  !/^[1-9]\d*$/u.test(parts) ||
  extra.length > 0
)
  throw new Error(
    "Usage: node --import tsx scripts/onagre/staging-bundle.mjs projects/ bundle.json.gz reviewed-cutoff [parts]",
  );
// Source data and bundles stay in ignored private storage, never in Git.
assertIgnoredFile(projectsDirectory);
assertIgnoredFile(output);
for (const part of await writeBundle({
  projectsDirectory,
  output,
  reviewedThrough,
  parts: Number(parts),
}))
  console.log(JSON.stringify(part));
