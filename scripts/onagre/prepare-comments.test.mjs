import test from "node:test";
import assert from "node:assert/strict";
import { prepareComments } from "./prepare-comments.mjs";
import { prepareFields } from "./prepare-fields.mjs";
test("internal opinion dates stay in labelled comments; excluded and blank values are omitted", () => {
  const rows = {
    avisserviceinstructeur: [
      { avisserviceinstructeurid: "2", dateavis: "2020-01-02", cmtavisserviceinstructeur: "  " },
    ],
    avisreglementaires: [
      { avisreglementairesid: "3", dateavis: null, nomsignataire: "Synthetic signatory" },
    ],
  };
  const mappings = [
    {
      key: "field:avisserviceinstructeur.dateavis",
      status: "review",
      target: "commentaire.content",
    },
    {
      key: "field:avisserviceinstructeur.cmtavisserviceinstructeur",
      status: "review",
      target: "commentaire.content",
    },
    {
      key: "field:avisreglementaires.nomsignataire",
      status: "excluded",
      target: "commentaire.content",
    },
  ];
  const original = structuredClone(rows),
    result = prepareComments(rows, mappings);
  assert.equal(result.length, 1);
  assert.equal(result[0].sourceKey, "onagre-national:avisserviceinstructeur:2:dateavis");
  assert.match(result[0].content, /Date de l’avis du service instructeur/u);
  assert.match(result[0].content, /2020-01-02/u);
  assert.deepEqual(rows, original);
  assert.deepEqual(prepareComments(rows, mappings), result);
});
test("coordinating service uses the validated description destination without inferring routing", () => {
  const rows = {
    demandes: [{ demandesid: "1", projetid: "2" }],
    projet: [{ projetid: "2", servicecoordinateurid: "3" }],
    services: [{ servicesid: "3", nomservice: "Historical service" }],
  };
  const rule = {
    key: "field:projet.servicecoordinateurid",
    status: "validated",
    target: "dossier.description",
  };
  const result = prepareFields(rows, [rule]);
  assert.equal(
    result.fields.description,
    "Service coordinateur du projet (Onagre) : Historical service",
  );
  assert(
    result.decisions
      .find((d) => d.target === "dossier.description")
      .evidence.includes("services:3.nomservice"),
  );
  assert.equal(prepareFields(rows, [{ ...rule, status: "discuss" }]).fields.description, null);
  rows.services = [];
  assert.throws(() => prepareFields(rows, [rule]), /Missing source coordinating service/u);
});
