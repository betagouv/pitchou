import test from "node:test";
import assert from "node:assert/strict";
import { groupPreparedDemandes, prepareDemandeLabel, validateProjects } from "./projects.mjs";

function sample(id, project = "100") {
  return {
    formatVersion: 1,
    identity: {
      sourceInstance: "onagre-national",
      sourceTable: "demandes",
      sourceId: id,
      projetId: project,
      key: `onagre-national:demandes:${id}`,
    },
    proposal: {
      dossier: {
        source: "onagre",
        name: `${id} - Synthetic project`,
        onagre_demande_identifier: `synthetic-${id}`,
        depot_date: null,
      },
      records: [],
    },
    source: {
      rows: { projet: [{ projetid: project, nomprojet: "Synthetic project" }] },
      relatedDemandes: [{ id: "1" }, { id: "2" }, { id: "3" }],
    },
    decisions: [{ target: "description", evidence: ["original evidence"] }],
  };
}

test("groups demandes by source project without changing source evidence or the input files", () => {
  const samples = [sample("2"), sample("1"), sample("4", "200")];
  const before = structuredClone(samples);
  const projects = groupPreparedDemandes(samples);
  assert.equal(projects.length, 2);
  assert.deepEqual(
    projects[0].demandes.map((d) => d.identity.sourceId),
    ["1", "2"],
  );
  assert.deepEqual(
    projects[0].omittedDemandes.map((d) => d.id),
    ["3"],
  );
  assert.equal(projects[0].proposal.name, "Synthetic project");
  assert.equal(Object.hasOwn(projects[0].demandes[0].proposal.dossier, "name"), false);
  assert.equal(projects[0].demandes[0].label, "synthetic-1");
  const located = sample("1");
  Object.assign(located.proposal.dossier, {
    communes: [{ name: "Dijon", code: "21231", postalCode: "21000" }],
    departments: ["21"],
  });
  assert.equal(prepareDemandeLabel(located), "synthetic-1 — Dijon (21)");
  located.proposal.dossier.communes = null;
  located.proposal.dossier.departments = ["71"];
  assert.equal(prepareDemandeLabel(located), "synthetic-1 — Saône-et-Loire (71)");
  assert.deepEqual(projects[0].demandes[0].source, samples[1].source);
  assert.deepEqual(samples, before);
});

test("rejects invalid, duplicate and cross-project identities before writing", () => {
  const project = groupPreparedDemandes([sample("1"), sample("2")])[0];
  assert.throws(() => validateProjects([sample("1")]), /version 2/u);
  assert.throws(() => validateProjects([project, project]), /unique/u);
  const duplicate = structuredClone(project);
  duplicate.demandes.push(duplicate.demandes[0]);
  assert.throws(() => validateProjects([duplicate]), /Duplicate/u);
  const moved = structuredClone(project);
  moved.demandes[0].identity.projetId = "999";
  assert.throws(() => validateProjects([moved]), /mismatched/u);
  const unprepared = structuredClone(project);
  delete unprepared.demandes[0].proposal.records;
  assert.throws(() => validateProjects([unprepared]), /prepared/u);
  const blank = structuredClone(project);
  blank.demandes[0].label = " ";
  assert.throws(() => validateProjects([blank]), /label/u);
});
