import { writeBundle } from "./staging-import/writer.mjs";
import { assertIgnoredFile } from "./local-import/files.mjs";

const [projectsDirectory, output, reviewedThrough, ...extra] = process.argv.slice(2);
if (!projectsDirectory || !output || !reviewedThrough || extra.length > 0)
  throw new Error(
    "Usage: node --import tsx scripts/onagre/staging-bundle.mjs projects/ bundle.json.gz reviewed-cutoff",
  );
// Source data and bundles stay in ignored private storage, never in Git.
assertIgnoredFile(projectsDirectory);
assertIgnoredFile(output);
console.log(JSON.stringify(await writeBundle({ projectsDirectory, output, reviewedThrough })));
