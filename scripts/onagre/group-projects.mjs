import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { assertIgnoredFile } from "./local-import/files.mjs";
import { groupPreparedDemandes } from "./local-import/projects.mjs";

const [outputDirectory, ...inputs] = process.argv.slice(2);
if (!outputDirectory || inputs.length === 0)
  throw new Error(
    "Usage: node scripts/onagre/group-projects.mjs ignored-output-directory prepared-demande.json ...",
  );
for (const file of inputs) assertIgnoredFile(file);
assertIgnoredFile(outputDirectory);
const projects = groupPreparedDemandes(
  await Promise.all(inputs.map(async (file) => JSON.parse(await readFile(file, "utf8")))),
);
const outputs = projects.map((project) =>
  join(outputDirectory, `${project.identity.sourceId}.json`),
);
for (const file of outputs) {
  assertIgnoredFile(file);
  try {
    await access(file);
  } catch (error) {
    if (error.code === "ENOENT") continue;
    throw error;
  }
  throw new Error(`Refusing to overwrite a prepared project: ${file}`);
}
await mkdir(outputDirectory, { recursive: true, mode: 0o700 });
for (let index = 0; index < projects.length; index++) {
  await writeFile(outputs[index], JSON.stringify(projects[index], null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
}
console.log(
  JSON.stringify(
    {
      files: outputs,
      projects: projects.length,
      demandes: projects.reduce((count, project) => count + project.demandes.length, 0),
    },
    null,
    2,
  ),
);
