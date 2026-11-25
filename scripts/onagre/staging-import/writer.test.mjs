import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readBundle } from "./bundle.mjs";
import { bundleLine, projectFiles, writeBundle } from "./writer.mjs";

const separators = String.fromCodePoint(0x2028, 0x2029, 0x85);
const project = (id, name) => ({
  formatVersion: 2,
  identity: {
    sourceInstance: "onagre-national",
    sourceTable: "projet",
    sourceId: id,
    key: `onagre-national:projet:${id}`,
  },
  proposal: { name },
  demandes: [
    {
      formatVersion: 1,
      identity: {
        sourceInstance: "onagre-national",
        sourceTable: "demandes",
        sourceId: `${id}0`,
        projetId: id,
        key: `onagre-national:demandes:${id}0`,
      },
      label: "Synthetic demande",
      proposal: { dossier: { source: "onagre", depot_date: null }, records: [] },
    },
  ],
});

test("bundle lines escape every line separator the reader would split on", () => {
  const line = bundleLine({ text: `a${separators}b\nc` });
  assert.equal(line.split(new RegExp(`\\r\\n|[\\n\\r${separators}]`, "u")).length, 2);
  assert.deepEqual(JSON.parse(line), { text: `a${separators}b\nc` });
});

test("the written bundle reads back through the staging reader", async () => {
  const dir = await fs.mkdtemp(join(tmpdir(), "pitchou-staging-writer-"));
  const projects = join(dir, "projects");
  await fs.mkdir(projects);
  const second = project("12", `Name with${separators}separators`);
  await fs.writeFile(join(projects, "12.json"), JSON.stringify(second));
  await fs.writeFile(join(projects, "2.json"), JSON.stringify(project("2", "First")));
  await fs.writeFile(join(projects, "notes.txt"), "ignored");
  const output = join(dir, "bundle.json.gz");
  try {
    assert.deepEqual(
      projectFiles(projects).map((file) => file.split("/").at(-1)),
      ["2.json", "12.json"],
    );
    const written = await writeBundle({
      projectsDirectory: projects,
      output,
      reviewedThrough: "cutoff",
    });
    assert.equal(written.projects, 2);
    const bundle = await readBundle(output, written.sha256);
    assert.equal(bundle.reviewedThrough, "cutoff");
    const read = [];
    for await (const entry of bundle.projects()) read.push(entry.project);
    assert.deepEqual(read, [project("2", "First"), second]);
    await assert.rejects(
      writeBundle({ projectsDirectory: projects, output, reviewedThrough: "cutoff" }),
      /EEXIST/u,
    );
    await assert.rejects(
      writeBundle({
        projectsDirectory: projects,
        output: join(dir, "other.gz"),
        reviewedThrough: " ",
      }),
      /reviewed cutoff/u,
    );
    await fs.writeFile(
      join(projects, "30.json"),
      JSON.stringify({ ...project("30", "Bad"), formatVersion: 1 }),
    );
    const failed = join(dir, "failed.gz");
    await assert.rejects(
      writeBundle({ projectsDirectory: projects, output: failed, reviewedThrough: "cutoff" }),
      /^Error: 30\.json: /u,
    );
    await assert.rejects(fs.access(failed), /ENOENT/u);
    await fs.access(output);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
