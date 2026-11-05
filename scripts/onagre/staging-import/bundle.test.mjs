import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { readBundle, hash } from "./bundle.mjs";

const project = {
  formatVersion: 2,
  identity: {
    sourceInstance: "onagre-national",
    sourceTable: "projet",
    sourceId: "1",
    key: "onagre-national:projet:1",
  },
  proposal: { name: "Synthetic project" },
  demandes: [
    {
      formatVersion: 1,
      identity: {
        sourceInstance: "onagre-national",
        sourceTable: "demandes",
        sourceId: "2",
        projetId: "1",
        key: "onagre-national:demandes:2",
      },
      label: "Synthetic demande",
      proposal: { dossier: { source: "onagre", depot_date: null }, records: [] },
    },
  ],
};
const header = {
  formatVersion: 1,
  target: "pitchou-staging",
  reviewedThrough: "synthetic",
  projectCount: 1,
  references: [],
};
const entry = { project, sha256: hash(JSON.stringify(project)), sourceSha256: "a".repeat(64) };

test("validates the complete streamed bundle before exposing any projects", async () => {
  const dir = await fs.mkdtemp(join(tmpdir(), "pitchou-staging-bundle-"));
  const path = join(dir, "bundle.gz");
  async function write(rows) {
    const bytes = gzipSync(rows.map((row) => JSON.stringify(row)).join("\n"));
    await fs.writeFile(path, bytes);
    return hash(bytes);
  }
  try {
    const digest = await write([header, entry]);
    const valid = await readBundle(path, digest);
    const results = [];
    for await (const item of valid.projects()) results.push(item.project);
    assert.deepEqual(results, [project]);
    await assert.rejects(readBundle(path, "b".repeat(64)), /SHA256/u);
    await assert.rejects(readBundle(path, await write([header])), /Incomplete/u);
    await assert.rejects(
      readBundle(path, await write([header, { ...entry, sha256: "c".repeat(64) }])),
      /checksum/u,
    );
    await assert.rejects(
      readBundle(path, await write([{ ...header, projectCount: 2 }, entry, entry])),
      /Duplicate/u,
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
