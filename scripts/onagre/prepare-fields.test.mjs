import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareFields } from "./prepare-fields.mjs";
import { prepareTitle } from "./prepare-fields/title.mjs";
import { motifDerogationOptions } from "../../libs/common/src/dossierFormOptions.ts";

const source = () => ({
  demandes: [
    {
      demandesid: "1",
      projetid: "2",
      departementsid: "3",
      periodes: "en été",
      motifderogationid: "17",
    },
  ],
  projet: [{ projetid: "2", communesid: "999", natureactivites: "Observation" }],
  communes_demandes: [{ demandesid: "1", communesid: "4" }],
  communes: [
    {
      communesid: "4",
      departementsid: "3",
      nomcommune: "Commune du projet",
      codeinseecommunes: "21001",
      codepostalcommune: "21000",
    },
    {
      communesid: "999",
      departementsid: "5",
      nomcommune: "Siège",
      codeinseecommunes: "71001",
      codepostalcommune: "71000",
    },
  ],
  departements: [
    { departementsid: "3", codedept: "021" },
    { departementsid: "5", codedept: "071" },
  ],
});
const mappings = [
  { key: "field:demandes.motifderogationid", status: "validated" },
  {
    key: "reference:motifderogation:60",
    section: "motifderogation",
    label: "17 · recherche",
    target: "dossier.motif_derogation",
    status: "validated",
    version: 1,
    rule: `Pour motifderogationid = 17, choisir le motif Pitchou « ${motifDerogationOptions[4]} ».`,
  },
];

test("numbers all sibling demandes numerically, independently of import order", () => {
  const demande = { demandesid: "10" },
    projet = { projetid: "1", nomprojet: "Projet partagé" };
  const siblings = [{ id: "20" }, { id: "2" }];
  assert.equal(prepareTitle(demande, projet, siblings).name, "2 - Projet partagé");
  assert.deepEqual(
    prepareTitle(demande, projet, siblings),
    prepareTitle(demande, projet, [...siblings].reverse()),
  );
  assert.equal(prepareTitle(demande, projet, []).name, "Projet partagé");
  assert.throws(() => prepareTitle(demande, projet, undefined), /complete sibling/u);
  assert.equal(prepareTitle(demande, { ...projet, nomprojet: null }, siblings).name, null);
});

test("maps demande geography, validated motif and labelled periods without changing the source", () => {
  const rows = source(),
    original = structuredClone(rows);
  const result = prepareFields(rows, mappings);
  assert.equal(result.fields.communes[0].code, "21001");
  assert.deepEqual(result.fields.departments, ["21"]);
  assert.equal(result.fields.primary_department, "21");
  assert.equal(result.fields.motif_derogation, motifDerogationOptions[4]);
  assert.equal(result.fields.description, "Observation\n\nPériodes souhaitées (Onagre) : en été");
  assert.deepEqual(rows, original);
  assert.deepEqual(prepareFields(rows, mappings), result);
});

test("keeps a department-only location without inferring the applicant's town", () => {
  const rows = source();
  rows.communes_demandes = [];
  const result = prepareFields(rows, mappings);
  assert.equal(result.fields.communes, null);
  assert.deepEqual(result.fields.departments, ["21"]);
  assert.equal(result.coverage.location, "department-only");
});

test("project fallback requires explicit permission and is never an applicant address fallback", () => {
  const rows = source();
  rows.communes_demandes = [];
  rows.demandes[0].departementsid = null;
  rows.communes_projet = [{ projetid: "2", communesid: "4" }];
  assert.equal(prepareFields(rows, mappings).coverage.location, "needs-review");
  const result = prepareFields(rows, mappings, { allowProjectLocationFallback: true });
  assert.equal(result.fields.communes[0].code, "21001");
  assert.equal(result.coverage.location, "project-fallback");
  rows.communes_projet = [];
  assert.equal(
    prepareFields(rows, mappings, { allowProjectLocationFallback: true }).coverage.location,
    "missing-source",
  );
});

test("does not let a project fallback replace a known demande department", () => {
  const rows = source();
  rows.communes_demandes = [];
  rows.communes_projet = [{ projetid: "2", communesid: "999" }];
  const result = prepareFields(rows, mappings, { allowProjectLocationFallback: true });
  assert.equal(result.fields.communes, null);
  assert.deepEqual(result.fields.departments, ["21"]);
});

test("reports a source motif awaiting review without silently importing it", () => {
  const result = prepareFields(
    source(),
    mappings.map((mapping) => ({ ...mapping, status: "discuss" })),
  );
  assert.equal(result.coverage.motif, "needs-review");
  assert(!Object.hasOwn(result.fields, "motif_derogation"));
});

test("rejects missing and conflicting geographical references", () => {
  const rows = source();
  rows.communes = [];
  assert.throws(() => prepareFields(rows, mappings), /Missing source commune/u);
  const conflict = source();
  conflict.demandes[0].departementsid = "5";
  assert.throws(() => prepareFields(conflict, mappings), /conflicts/u);
});

test("preserves overseas department codes", () => {
  const rows = source();
  rows.communes_demandes = [];
  rows.departements[0].codedept = "971";
  assert.deepEqual(prepareFields(rows, mappings).fields.departments, ["971"]);
});
