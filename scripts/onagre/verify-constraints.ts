import assert from "node:assert/strict";
import { createRequire } from "node:module";
import type { Knex } from "../../libs/database/node_modules/knex/types/index.d.ts";
import type { OnagreBundle } from "@pitchou/types/onagre.ts";
import { createFixture } from "./transfer/fixtures.ts";
import { withConstraints } from "@pitchou/common/onagre/constraints.ts";
import { stageSnapshot } from "@pitchou/server/onagre/snapshots.ts";
import { parseBundle } from "@pitchou/server/onagre/validation.ts";

const fixture = await createFixture();
const knex = createRequire(new URL("../../libs/database/package.json", import.meta.url))(
  "knex",
) as (options: unknown) => Knex;
const db = knex({ client: "pg", connection: fixture.targetUrl });
try {
  const bundle: OnagreBundle = {
    format: "pitchou-onagre-v1",
    fingerprint: "c".repeat(64),
    workbookFingerprint: "b".repeat(64),
    filename: "fixture",
    tables: [
      { name: "projet", columns: ["projetid"], count: 1, samples: [{ projetid: "2" }] },
      {
        name: "demandes",
        columns: ["demandesid", "projetid"],
        count: 1,
        samples: [{ demandesid: "1", projetid: "2" }],
      },
    ],
    mappings: [
      {
        key: "field:projet.projetid",
        section: "projet",
        label: "projetid",
        context: "",
        proposal: "",
        confidence: "",
        notes: "Preserve",
      },
    ],
    demandes: [{ demandesid: "1", projetid: "2" }],
    projets: [{ projetid: "2" }],
  };
  const first = await db.transaction((trx) => stageSnapshot(trx, parseBundle(bundle)));
  const decisions = await db("onagre_mapping").select("*");
  const rows = await db("onagre_source_demande").select("*");
  const enriched = {
    ...bundle,
    tables: withConstraints(
      "ALTER TABLE ONLY onagre.projet ADD CONSTRAINT pk PRIMARY KEY (projetid); ALTER TABLE onagre.demandes ADD CONSTRAINT fk FOREIGN KEY (projetid) REFERENCES onagre.projet(projetid);",
      bundle.tables,
    ),
  };
  for (let i = 0; i < 2; i++)
    assert.deepEqual(await db.transaction((trx) => stageSnapshot(trx, parseBundle(enriched))), {
      ...first,
      duplicate: true,
    });
  const saved = await db("onagre_snapshot").where({ id: first.id }).first();
  assert.deepEqual(saved.tables, enriched.tables);
  assert.deepEqual(await db("onagre_mapping").select("*"), decisions);
  assert.deepEqual(await db("onagre_source_demande").select("*"), rows);
  await db.transaction((trx) => stageSnapshot(trx, parseBundle(bundle)));
  assert.deepEqual(
    (await db("onagre_snapshot").where({ id: first.id }).first()).tables,
    enriched.tables,
  );
  const badTarget = structuredClone(enriched);
  badTarget.tables[1].constraints!.foreignKeys[0].targetColumns = ["missing"];
  assert.throws(() => parseBundle(badTarget));
  const changed = structuredClone(enriched);
  changed.tables[0].constraints!.primaryKey = [];
  await assert.rejects(
    db.transaction((trx) => stageSnapshot(trx, parseBundle(changed))),
    /contraintes diffèrent/u,
  );
  assert.deepEqual(
    (await db("onagre_snapshot").where({ id: first.id }).first()).tables,
    enriched.tables,
  );
  console.log(
    "PASS legacy snapshot enrichment, repeat no-op, old package cannot erase metadata, no decisions/rows changed, invalid target refused, conflicting constraints roll back.",
  );
} finally {
  await db.destroy();
  await fixture.cleanup();
}
