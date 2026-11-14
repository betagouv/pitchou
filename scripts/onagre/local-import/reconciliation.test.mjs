import test from "node:test";
import assert from "node:assert/strict";
import {
  findOnagreCandidates,
  createOnagreMatcher,
} from "../../../libs/server/src/onagre/reconciliation.ts";
import { reconciliationSource, assertNoUnreviewedDuplicates } from "./reconciliation.mjs";
import { connect, initialize } from "./connection.mjs";
import { groupPreparedDemandes } from "./projects.mjs";
import { importSamples } from "./run.mjs";

const source = {
  projectId: "100",
  projectCode: "2024-03-13f-00510",
  name: "Restauration du seuil de Meillon",
  departments: ["64"],
  demandes: [{ id: "1", code: "2024-00510-011-001" }],
};
const target = (reference, extra = {}) => ({
  id: 42,
  onagre_demande_identifier: reference,
  ...extra,
});
test("recognizes normalized, embedded and combined references without merging identities", () => {
  for (const reference of [
    " 2024-00510-011-001 ",
    "2024–00510–011–001",
    "Demande : 2024-00510-011-001 / autre : 2023-00925-011-001",
  ])
    assert.deepEqual(findOnagreCandidates(source, [target(reference)])[0].demandeIds, ["1"]);
  const combined = findOnagreCandidates(source, [
    target("projet : 2024-03-13F-00510/demande : 2024-00510-011-001"),
  ])[0];
  assert.deepEqual(combined.reasons, ["demande_reference", "project_reference"]);
  assert.deepEqual(findOnagreCandidates(source, [target(source.projectCode)])[0].demandeIds, []);
});
test("does not match prefixes, dates or another numbered demande", () => {
  for (const reference of [
    null,
    "2024",
    "2024-00510",
    "2024-00510-011-0010",
    "2024-00510-011-001-extra",
    "X2024-00510-011-001",
    "2024-00510-011-002",
  ])
    assert.deepEqual(findOnagreCandidates(source, [target(reference)]), []);
});
test("same-name and fuzzy candidates require a shared department and remain separate", () => {
  const rows = [
    target(null, { id: 1, name: "RESTAURATION DU SEUIL DE MEILLON", departments: ["64"] }),
    target(null, { id: 2, name: source.name, departments: ["65"] }),
    target(null, {
      id: 3,
      name: "Travaux de restauration du seuil à Meillon",
      primary_department: "64",
    }),
  ];
  const result = createOnagreMatcher(rows)(source);
  assert.deepEqual(
    result.map((r) => r.dossierId),
    [1, 3],
  );
  assert.deepEqual(
    result.map((r) => r.reasons),
    [["same_name_and_department"], ["similar_name_and_department"]],
  );
  assert(result.every((r) => r.demandeIds.length === 0));
});
test("all existing records and all matching source demandes are retained in ambiguous cases", () => {
  const repeated = {
    ...source,
    demandes: [...source.demandes, { id: "2", code: source.demandes[0].code }],
  };
  const result = findOnagreCandidates(repeated, [
    target(source.demandes[0].code),
    target(source.demandes[0].code, { id: 43 }),
  ]);
  assert.equal(result.length, 2);
  assert(result.every((r) => r.demandeIds.join() === "1,2"));
});
function project() {
  return groupPreparedDemandes([
    {
      formatVersion: 1,
      identity: {
        sourceInstance: "onagre-national",
        sourceTable: "demandes",
        sourceId: "1",
        projetId: "100",
        key: "onagre-national:demandes:1",
      },
      proposal: {
        dossier: {
          source: "onagre",
          name: source.name,
          onagre_demande_identifier: source.demandes[0].code,
          depot_date: null,
        },
        records: [],
      },
      source: {
        rows: {
          projet: [{ projetid: "100", nomprojet: source.name, codeprojet: source.projectCode }],
        },
        relatedDemandes: [{ id: "2", code: "2024-00510-011-002" }],
      },
    },
  ])[0];
}
test("an omitted sibling reference still blocks a partial project import", () => {
  const summary = reconciliationSource(project());
  assert.equal(summary.projectCode, source.projectCode);
  assert.deepEqual(findOnagreCandidates(summary, [target("2024-00510-011-002")])[0].demandeIds, [
    "2",
  ]);
});
test(
  "database preflight rejects before business writes and preserves registered ownership",
  {
    skip: process.env.RUN_ONAGRE_DATABASE_TESTS !== "1",
  },
  async () => {
    const client = await connect(process.env);
    const fixture = project();
    fixture.demandes[0].source.rows.projet[0].codeprojet = "2099-regression-local-project";
    fixture.demandes[0].source.relatedDemandes = [];
    fixture.demandes[0].proposal.dossier.onagre_demande_identifier =
      "2099-regression-local-demande";
    try {
      await client.begin();
      await initialize(client);
      const [{ count: before }] = (await client.query("SELECT count(*) FROM dossier_projet")).rows;
      const [{ id }] = (
        await client.query(
          "INSERT INTO dossier(name,source,onagre_demande_identifier) VALUES ('Synthetic overlap check','demarche_numerique',$1) RETURNING id",
          [fixture.demandes[0].source.rows.projet[0].codeprojet],
        )
      ).rows;
      await assert.rejects(importSamples(client, [fixture], "unused@example.invalid"), (error) => {
        assert.equal(error.reconciliation[0].projectId, "100");
        assert(error.reconciliation[0].candidates.some((c) => c.dossierId === id));
        return true;
      });
      assert.equal(
        (await client.query("SELECT count(*) FROM dossier_projet")).rows[0].count,
        before,
      );
      await client.query("UPDATE dossier SET source='onagre' WHERE id=$1", [id]);
      await assert.rejects(assertNoUnreviewedDuplicates(client, [fixture]), /reconciliation/u);
      await client.query(
        "INSERT INTO onagre_local_import.identity(dossier_key,source_key,table_name,target_id,last_fields) VALUES ('test','test','dossier',$1,'{}')",
        [String(id)],
      );
      await assertNoUnreviewedDuplicates(client, [fixture]);
      await client.finish(false);
    } finally {
      await client.end();
    }
  },
);
