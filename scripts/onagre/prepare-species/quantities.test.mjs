import test from "node:test";
import assert from "node:assert/strict";
import { prepareQuantities } from "./quantities.mjs";

function fixture() {
  const source = { descriptionsespecesid: "1", especesid: "2", quantiteespeces: "30" };
  const rows = {
    descriptionsespeces: [source],
    especes: [{ especesid: "2", nomscientifique: "Synthetic species" }],
    activites: [{ activitesid: "3", libactivites: "Capture" }],
    descriptionsespeces_activites: [{ descriptionsespecesid: "1", activitesid: "3" }],
  };
  const types = [{ identifiant_pitchou: "test", critere_nombre_individus: true }];
  const impacts = [
    {
      sourceKey: "onagre-national:descriptionsespeces:1:activites:3",
      values: { impact_type: "test", nombre_individus: null, nids: null, oeufs: null },
    },
  ];
  return { source, rows, types, impacts };
}

test("a positive count fills its single compatible impact without changing the source", () => {
  const { rows, types, impacts } = fixture();
  const before = structuredClone(rows);
  assert.deepEqual(prepareQuantities(rows, types, impacts), { notes: [], issues: [] });
  assert.equal(impacts[0].values.nombre_individus, "30");
  assert.deepEqual(rows, before);
});

test("nests and eggs retain their own units", () => {
  const { source, rows, types, impacts } = fixture();
  source.quantiteespeces = null;
  source.quantitenids = "7";
  source.quantiteoeufs = "12";
  Object.assign(types[0], { critere_nids: true, critere_oeufs: true });
  prepareQuantities(rows, types, impacts);
  assert.equal(impacts[0].values.nids, 7);
  assert.equal(impacts[0].values.oeufs, 12);
  assert.equal(impacts[0].values.nombre_individus, null);
});

test("a shared count is never duplicated across capture and release impacts", () => {
  const { source, rows, types, impacts } = fixture();
  source.quantiteespeces = "60";
  impacts.push({
    ...impacts[0],
    sourceKey: "onagre-national:descriptionsespeces:1:activites:4",
    values: { ...impacts[0].values },
  });
  const result = prepareQuantities(rows, types, impacts);
  assert(impacts.every((impact) => impact.values.nombre_individus === null));
  assert.equal(result.notes.length, 1);
  assert(result.notes[0].includes("Nombre de spécimens indiqué dans Onagre : 60"));
});

test("specimens are not converted to eggs when the activity supports only eggs", () => {
  const { source, rows, types, impacts } = fixture();
  source.quantiteespeces = "87";
  types[0].critere_nombre_individus = false;
  types[0].critere_oeufs = true;
  const result = prepareQuantities(rows, types, impacts);
  assert.equal(impacts[0].values.oeufs, null);
  assert.equal(impacts[0].values.nombre_individus, null);
  assert(result.notes[0].includes("87"));
});

test("zeros, ranges and surface components survive as labelled comments", () => {
  const { source, rows, types, impacts } = fixture();
  Object.assign(source, {
    quantiteespeces: "0",
    especes_classeeffectif: "5",
    surfacedetruiteares: "0",
    surfacedetruitehectares: "2",
  });
  rows.especes_classeeffectif = [{ classeeffectifid: "5", libclasseeffectif: "11-100" }];
  const result = prepareQuantities(rows, types, impacts);
  assert.equal(impacts[0].values.nombre_individus, null);
  for (const text of [
    "spécimens indiqué dans Onagre : 0",
    "11-100",
    "(ares) indiqué dans Onagre : 0",
    "(hectares) indiqué dans Onagre : 2",
  ])
    assert(result.notes.some((note) => note.includes(text)));
});

test("conflicting or missing results prevent an inferred count", () => {
  for (const results of [[], [{ resultatid: "6", nbindividus: "20" }]]) {
    const { source, rows, types, impacts } = fixture();
    source.resultatid = "6";
    rows.resultat = results;
    const prepared = prepareQuantities(rows, types, impacts);
    assert.equal(impacts[0].values.nombre_individus, null);
    assert(prepared.notes.some((note) => note.includes("30")));
    if (results.length > 0)
      assert(
        prepared.notes.some((note) => note.includes("Résultat Onagre, Nombre d’individus : 20")),
      );
  }
});

test("a matching result permits the description count but remains identifiable separately", () => {
  const { source, rows, types, impacts } = fixture();
  source.resultatid = "6";
  rows.resultat = [{ resultatid: "6", nbindividus: "30" }];
  const prepared = prepareQuantities(rows, types, impacts);
  assert.equal(impacts[0].values.nombre_individus, "30");
  assert(prepared.notes[0].includes("Résultat Onagre"));
});

test("unknown impacts and unresolved taxa still preserve their quantity", () => {
  for (const mode of ["unknown", "unresolved", "partially-known"]) {
    const { rows, types, impacts } = fixture();
    if (mode === "unresolved") impacts.length = 0;
    else if (mode === "unknown") impacts[0].values.impact_type = null;
    else
      impacts.push({
        sourceKey: "onagre-national:descriptionsespeces:1:activites:4",
        values: { impact_type: null },
      });
    const result = prepareQuantities(rows, types, impacts);
    assert(result.notes.some((note) => note.includes("30")));
    assert(impacts.every((impact) => !impact.values.nombre_individus));
  }
});
