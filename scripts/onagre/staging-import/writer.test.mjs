import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readBundle } from "./bundle.mjs";
import { bundleLine, partOutputs, projectFiles, splitFiles, writeBundle } from "./writer.mjs";

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
    const [written] = await writeBundle({
      projectsDirectory: projects,
      output,
      reviewedThrough: "cutoff",
    });
    assert.equal(written.projects, 2);
    const bundle = await readBundle(output, written.sha256);
    assert.equal(bundle.part, undefined);
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

test("parts split projects in order and keep each part under the upload limit", async () => {
  assert.deepEqual(splitFiles([1, 2, 3, 4, 5], 2), [
    [1, 2, 3],
    [4, 5],
  ]);
  assert.deepEqual(splitFiles([1, 2, 3, 4, 5], 4), [[1], [2, 3], [4], [5]]);
  assert.deepEqual(partOutputs("dir/bundle.json.gz", 2), [
    "dir/bundle-part-1-of-2.json.gz",
    "dir/bundle-part-2-of-2.json.gz",
  ]);
  assert.throws(() => partOutputs("dir/bundle.gz", 2), /json\.gz/u);
  const dir = await fs.mkdtemp(join(tmpdir(), "pitchou-staging-parts-"));
  const projects = join(dir, "projects");
  await fs.mkdir(projects);
  for (const id of ["1", "2", "3"])
    await fs.writeFile(join(projects, `${id}.json`), JSON.stringify(project(id, `Project ${id}`)));
  const output = join(dir, "bundle.json.gz");
  try {
    const parts = await writeBundle({
      projectsDirectory: projects,
      output,
      reviewedThrough: "cutoff",
      parts: 2,
    });
    assert.deepEqual(
      parts.map(({ path, projects: count }) => [path.split("/").at(-1), count]),
      [
        ["bundle-part-1-of-2.json.gz", 2],
        ["bundle-part-2-of-2.json.gz", 1],
      ],
    );
    const ids = [];
    for (const [index, part] of parts.entries()) {
      const bundle = await readBundle(part.path, part.sha256);
      assert.equal(bundle.part, `${index + 1}/2`);
      for await (const entry of bundle.projects()) ids.push(entry.project.identity.sourceId);
    }
    assert.deepEqual(ids, ["1", "2", "3"]);
    await assert.rejects(
      writeBundle({ projectsDirectory: projects, output, reviewedThrough: "cutoff", parts: 2 }),
      /EEXIST/u,
    );
    const small = join(dir, "small.json.gz");
    await assert.rejects(
      writeBundle({
        projectsDirectory: projects,
        output: small,
        reviewedThrough: "cutoff",
        parts: 2,
        maxBytes: 10,
      }),
      /upload limit; use more parts/u,
    );
    assert.deepEqual(
      (await fs.readdir(dir)).filter((name) => name.startsWith("small")),
      [],
    );
    await assert.rejects(
      writeBundle({
        projectsDirectory: projects,
        output: small,
        reviewedThrough: "cutoff",
        parts: 4,
      }),
      /number of parts/u,
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
