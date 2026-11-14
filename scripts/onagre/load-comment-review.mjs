// Stage local review evidence. This does not create decisions or update dossiers.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { connect } from "./local-import/connection.mjs";
import { commentCategories } from "../../libs/types/src/onagreComments.ts";

const [path, ...rest] = process.argv.slice(2);
if (!path || rest.length > 0) throw new Error("Usage: load-comment-review.mjs <groups.json>");
const bytes = await fs.readFile(path),
  groups = JSON.parse(bytes);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const inventorySha256 = hash(bytes);
assert(Array.isArray(groups) && groups.length > 0);
const ids = new Set();
const rows = groups.map((g) => {
  assert(/^[a-f0-9]{16}$/u.test(g.id) && !ids.has(g.id));
  ids.add(g.id);
  assert(
    Object.hasOwn(commentCategories, g.category) && typeof g.value === "string" && g.value.trim(),
  );
  assert(Number.isSafeInteger(g.projectCount) && g.projectCount > 0);
  assert(Number.isSafeInteger(g.demandeCount) && g.demandeCount >= g.projectCount);
  assert(
    Array.isArray(g.examples) &&
      g.examples.length > 0 &&
      Array.isArray(g.demandes) &&
      Array.isArray(g.descriptions),
  );
  const payload = {
    context: g.context,
    variants: g.variants,
    populations: g.populations,
    projectIds: g.projects,
    demandeKeys: g.demandes,
    descriptionIds: g.descriptions,
    examples: g.examples.map(({ projectPath: _path, ...example }) => example),
  };
  const values = {
    id: g.id,
    category: g.category,
    value: g.value,
    project_count: g.projectCount,
    demande_count: g.demandeCount,
    payload,
  };
  return {
    ...values,
    review_hash: hash(JSON.stringify(values)),
    provenance: {
      inventorySha256,
      scope:
        "All nonempty prepared Onagre projects, including blocked projects and linked DN references",
    },
  };
});
const client = await connect(process.env);
try {
  await client.begin();
  await client.query("SELECT pg_advisory_xact_lock(10112026, 3)");
  const existing = await client.trx("onagre_comment_group").select("id", "review_hash");
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const row of existing)
    assert.equal(
      byId.get(row.id)?.review_hash,
      row.review_hash,
      "Existing inventory differs; review before replacing it",
    );
  for (let offset = 0; offset < rows.length; offset += 100)
    await client
      .trx("onagre_comment_group")
      .insert(rows.slice(offset, offset + 100))
      .onConflict("id")
      .ignore();
  await client.finish(true);
  console.log(
    JSON.stringify({
      groups: rows.length,
      existing: existing.length,
      inserted: rows.length - existing.length,
      inventorySha256,
    }),
  );
} finally {
  await client.end();
}
