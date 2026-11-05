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

test("shared organisations cannot receive contradictory prepared metadata in one batch", () => {
  const project = groupPreparedDemandes([sample("1"), sample("2")])[0];
  const porteur = {
    type: "personne_morale",
    siret: "00000000000000",
    values: { legal_name: "Synthetic company", address: null, postal_code: null, insee_code: null },
    verification: {
      status: "verified",
      reason: "Synthetic fixture",
      sources: ["https://example.test/registry"],
    },
  };
  for (const demande of project.demandes) demande.proposal.porteur = structuredClone(porteur);
  validateProjects([project]);
  project.demandes[1].proposal.porteur.values.legal_name = "Different company";
  assert.throws(() => validateProjects([project]), /Conflicting prepared metadata/u);
});

test("large location scopes keep the source code and a compact department count", () => {
  const demande = sample("1");
  demande.proposal.dossier.departments = Array.from({ length: 30 }, (_, index) =>
    String(index < 19 ? index + 1 : index + 2).padStart(2, "0"),
  );
  assert.equal(prepareDemandeLabel(demande), "synthetic-1 — 30 départements");
  assert.equal(demande.proposal.dossier.departments.length, 30);
});

test("project-only initial demandes retain honest identities and reject invented source events", () => {
  const project = groupPreparedDemandes([sample("1")])[0];
  const d = project.demandes[0];
  d.identity = {
    sourceInstance: "onagre-national",
    sourceTable: "projet",
    sourceId: "100",
    projetId: "100",
    key: "onagre-national:projet:100:initial-demande",
  };
  d.label = "Demande initiale — projet Onagre sans demande";
  d.source.rows.demandes = [];
  d.source.relatedDemandes = [];
  project.omittedDemandes = [];
  d.proposal.dossier.onagre_demande_identifier = "";
  d.proposal.dossier.ddep_depot_date = null;
  validateProjects([project]);
  for (const mutate of [
    (p) => {
      p.demandes[0].identity.key = "onagre-national:demandes:100";
    },
    (p) => {
      p.demandes[0].proposal.dossier.onagre_demande_identifier = "invented";
    },
    (p) => {
      p.demandes[0].proposal.dossier.ddep_depot_date = "2020-01-01";
    },
    (p) => {
      p.demandes[0].source.rows.demandes = [{ demandesid: "1" }];
    },
    (p) => {
      p.demandes[0].label = "Demande";
    },
    (p) => {
      p.demandes[0].proposal.records.push({
        table: "evenement_phase_dossier",
        sourceKey: "onagre-national:projet:100:phase",
        values: { phase: "Instruction", timestamp: null },
      });
    },
    (p) => {
      p.omittedDemandes = [{ id: "9", reason: "cancelled" }];
    },
    (p) => {
      p.demandes.push(sample("2"));
    },
  ]) {
    const invalid = structuredClone(project);
    mutate(invalid);
    assert.throws(() => validateProjects([invalid]));
  }
});
