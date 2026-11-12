// Load read-only review facts locally, without changing dossiers, decisions or inventory hashes.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import assert from "node:assert/strict";
import { connect } from "./local-import/connection.mjs";
import { hash, sourceReader } from "./load-comment-evidence/source.mjs";

const [directory, selectionPath, ...extra] = process.argv.slice(2);
assert(
  directory && selectionPath && extra.length === 0,
  "Usage: load-comment-evidence.mjs <inventory-directory> <selection.json>",
);
const read = (name) => fs.readFileSync(path.join(directory, name));
const groupBytes = read("groups.json"),
  referenceBytes = read("pitchou-references.json");
const selectionBytes = fs.readFileSync(selectionPath);
const groups = new Map(JSON.parse(groupBytes).map((g) => [g.id, g]));
const readSource = sourceReader(JSON.parse(selectionBytes), JSON.parse(referenceBytes));
const provenance = {
  inventorySha256: hash(groupBytes),
  referencesSha256: hash(referenceBytes),
  selectionSha256: hash(selectionBytes),
  occurrencesSha256: hash(read("occurrences.jsonl")),
};
const client = await connect(process.env);
try {
  await client.begin();
  await client.query("SELECT pg_advisory_xact_lock(10112026, 3)");
  const stored = await client
    .trx("onagre_comment_group")
    .select("id", "review_hash", "provenance", "payload", "category", "value");
  assert.equal(stored.length, groups.size);
  const storedById = new Map(stored.map((g) => [g.id, g]));
  for (const g of stored) {
    assert.equal(g.category, groups.get(g.id)?.category);
    assert.equal(g.value, groups.get(g.id)?.value);
    assert.equal(g.provenance.inventorySha256, provenance.inventorySha256);
    assert.deepEqual(g.payload.demandeKeys, groups.get(g.id)?.demandes);
    assert.deepEqual(g.payload.descriptionIds, groups.get(g.id)?.descriptions);
    assert.deepEqual(g.payload.context, groups.get(g.id)?.context);
  }
  const rows = new Map(),
    coverage = new Map();
  let occurrenceCount = 0;
  const lines = readline.createInterface({
    input: fs.createReadStream(path.join(directory, "occurrences.jsonl")),
    crlfDelay: Infinity,
  });
  for await (const line of lines) {
    if (!line.trim()) continue;
    const occurrence = JSON.parse(line),
      group = groups.get(occurrence.groupId);
    assert(group && group.demandes.includes(occurrence.demandeKey));
    const { facts, sourceHash } = readSource(occurrence, group);
    const key = `${group.id}/${occurrence.demandeKey}`;
    if (!rows.has(key))
      rows.set(key, {
        group_id: group.id,
        demande_key: occurrence.demandeKey,
        review_hash: storedById.get(group.id).review_hash,
        occurrences: new Map(),
        provenance: { ...provenance, sourceSha256: sourceHash },
      });
    const row = rows.get(key);
    assert.equal(row.provenance.sourceSha256, sourceHash);
    const previous = row.occurrences.get(facts.descriptionId);
    if (previous) assert.deepEqual(previous, facts);
    row.occurrences.set(facts.descriptionId, facts);
    if (!coverage.has(group.id)) coverage.set(group.id, new Set());
    coverage.get(group.id).add(facts.descriptionId);
    occurrenceCount++;
  }
  for (const g of groups.values()) {
    for (const key of g.demandes) assert(rows.has(`${g.id}/${key}`), "Missing demande evidence");
    assert.deepEqual([...coverage.get(g.id)].sort(), [...g.descriptions].sort());
  }
  const output = [...rows.values()].map((row) => {
    const values = {
      ...row,
      occurrences: [...row.occurrences.values()].sort((a, b) =>
        a.descriptionId.localeCompare(b.descriptionId),
      ),
    };
    return { ...values, evidence_hash: hash(JSON.stringify(values)) };
  });
  const byKey = new Map(output.map((r) => [`${r.group_id}/${r.demande_key}`, r.evidence_hash]));
  const existing = await client
    .trx("onagre_comment_evidence")
    .select("group_id", "demande_key", "evidence_hash");
  for (const row of existing)
    assert.equal(
      row.evidence_hash,
      byKey.get(`${row.group_id}/${row.demande_key}`),
      "Existing evidence differs; do not silently replace it",
    );
  for (let offset = 0; offset < output.length; offset += 100)
    await client
      .trx("onagre_comment_evidence")
      .insert(
        output
          .slice(offset, offset + 100)
          .map((r) => ({ ...r, occurrences: JSON.stringify(r.occurrences) })),
      )
      .onConflict(["group_id", "demande_key"])
      .ignore();
  assert.equal(
    Number((await client.trx("onagre_comment_evidence").count("* as count").first()).count),
    output.length,
  );
  await client.finish(true);
  console.log(
    JSON.stringify({
      groups: groups.size,
      demandesWithinGroups: output.length,
      occurrences: occurrenceCount,
      ...provenance,
    }),
  );
} finally {
  await client.end();
}
