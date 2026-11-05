import test from "node:test";
import assert from "node:assert/strict";
import { prepareSpecies } from "./prepare-species.mjs";
const fixture = () => ({
  rows: {
    especes: [
      {
        especesid: "1",
        notaxref: "10",
        nonomscientifique: "11",
        nomscientifique: "Synthetic synonym",
      },
    ],
    activites: [{ activitesid: "2", libactivites: "Destruction" }],
    methode: [{ methodeid: "3", libmethode: "Véhicule motorisé" }],
    descriptionsespeces: [{ descriptionsespecesid: "4", especesid: "1", methodeid: "3" }],
    descriptionsespeces_activites: [{ descriptionsespecesid: "4", activitesid: "2" }],
  },
  refs: {
    taxref: [{ cd_nom: "11", cd_ref: "10" }],
    species: [
      {
        cd_ref: "10",
        classification: "faune non-oiseau",
        noms_scientifiques: ["Synthetic accepted", "Synthetic synonym"],
      },
    ],
    types: [
      {
        classification: "faune non-oiseau",
        identifiant_pitchou: "P-test",
        activites_onagre: ["Destruction"],
        critere_moyen_de_poursuite: true,
      },
    ],
    pursuits: [
      {
        classification: "faune non-oiseau",
        code: "2",
        libelle_pitchou: "Véhicules à moteur en mouvement",
      },
    ],
  },
});
test("verified synonyms resolve; approved vehicle mapping needs an applicable criterion", () => {
  const { rows, refs } = fixture();
  assert.equal(prepareSpecies(rows, refs).impacts[0].values.impact_moyen_de_poursuite, null);
  const prepared = prepareSpecies(rows, refs, { motorVehicleNonBird: true });
  assert.equal(prepared.impacts[0].values.cd_ref, "10");
  assert.equal(prepared.impacts[0].values.impact_moyen_de_poursuite, "2");
  refs.types[0].critere_moyen_de_poursuite = false;
  const habitat = prepareSpecies(rows, refs, { motorVehicleNonBird: true });
  assert.equal(habitat.impacts[0].values.impact_moyen_de_poursuite, null);
  assert.match(habitat.notes[0], /Véhicule motorisé/u);
});
test("matching numeric IDs alone cannot resolve a different species", () => {
  const { rows, refs } = fixture();
  rows.especes[0].nomscientifique = "Different taxon";
  const p = prepareSpecies(rows, refs);
  assert.equal(p.impacts.length, 0);
  assert.equal(p.issues[0].code, "species-reference-unresolved");
  assert(
    p.notes.some((note) => note.includes("Different taxon — Activités déclarées : Destruction")),
  );
});

test("taxa absent from the catalogue retain original names and activities in comments", () => {
  const { rows, refs } = fixture();
  refs.species = [];
  rows.activites.push({ activitesid: "5", libactivites: "Capture de spécimens" });
  rows.descriptionsespeces_activites.push({ descriptionsespecesid: "4", activitesid: "5" });
  const before = structuredClone(rows);
  const prepared = prepareSpecies(rows, refs, {
    activityInterpretationBySourceKey: {
      "onagre-national:descriptionsespeces:4:activites:5": {
        label: "Another interpretation",
        reason: "Synthetic evidence",
        evidence: ["synthetic-source"],
      },
    },
  });
  assert.equal(prepared.impacts.length, 0);
  assert.deepEqual(
    prepared.notes.filter((note) => note.startsWith("Mention conservée")),
    [
      "Mention conservée hors du tableau des espèces (Onagre) : Synthetic synonym — Activités déclarées : Destruction ; Capture de spécimens.",
    ],
  );
  assert.deepEqual(rows, before);
});

test("an unresolved taxon without an activity remains in comments without inventing one", () => {
  const { rows, refs } = fixture();
  refs.taxref = [];
  rows.descriptionsespeces_activites = [];
  const prepared = prepareSpecies(rows, refs);
  assert.equal(prepared.impacts.length, 0);
  assert.deepEqual(
    prepared.notes.filter((note) => note.startsWith("Mention conservée")),
    [
      "Mention conservée hors du tableau des espèces (Onagre) : Synthetic synonym — Activités déclarées : non renseignées.",
    ],
  );
});

test("an unknown impact retains its method as text without interpreting a matching numeric code", () => {
  const { rows, refs } = fixture();
  rows.methode[0] = { methodeid: "3", libmethode: "Autres travaux", codemethodehabides: "11" };
  refs.types = [];
  const prepared = prepareSpecies(rows, refs);
  assert.equal(prepared.impacts[0].values.impact_type, null);
  assert.equal(prepared.impacts[0].values.impact_methode, null);
  assert.equal(prepared.impacts[0].values.impact_moyen_de_poursuite, null);
  assert(prepared.notes.some((note) => note.includes("méthode Onagre « Autres travaux »")));
});
test("zero quantities remain explicitly pending; duplicate activities are ambiguous", () => {
  const { rows, refs } = fixture();
  rows.descriptionsespeces[0].quantiteespeces = "0";
  const p = prepareSpecies(rows, refs);
  assert.equal(p.impacts[0].values.nombre_individus, null);
  assert.equal(
    p.issues.find((issue) => issue.code === "species-quantities-review").values.quantiteespeces,
    "0",
  );
  refs.types.push({ ...refs.types[0], identifiant_pitchou: "P-other" });
  const ambiguous = prepareSpecies(rows, refs);
  assert.equal(ambiguous.impacts.length, 1);
  assert.equal(ambiguous.impacts[0].values.impact_type, null);
  assert.equal(ambiguous.impacts[0].values.impact_moyen_de_poursuite, null);
});
test("vehicle approval does not silently extend to birds", () => {
  const { rows, refs } = fixture();
  refs.species[0].classification = "oiseau";
  refs.types[0].classification = "oiseau";
  const p = prepareSpecies(rows, refs, { motorVehicleNonBird: true });
  assert.equal(p.impacts[0].values.impact_moyen_de_poursuite, null);
  assert.equal(p.issues[0].code, "species-method-review");
});

test("equivalent activity spellings resolve without changing scientific names", () => {
  for (const [source, reference] of [
    ["Arrachage - Déracinage", "Arrachage – Déracinage"],
    ["Dégradation d'aires de repos", "Dégradation d'aire de repos"],
    [
      "Transport de spécimens morts (autres que naturalisés)",
      "Transport de spécimens morts (autres qu naturalisés)",
    ],
  ]) {
    const { rows, refs } = fixture();
    rows.activites[0].libactivites = source;
    refs.types[0].activites_onagre = [reference];
    assert.equal(prepareSpecies(rows, refs).impacts.length, 1);
  }
});

test("an explicit per-impact choice resolves ambiguity only among matching candidates", () => {
  const { rows, refs } = fixture();
  refs.types.push({ ...refs.types[0], identifiant_pitchou: "P-other" });
  const key = "onagre-national:descriptionsespeces:4:activites:2";
  const options = { impactTypeBySourceKey: { [key]: "P-other" } };
  assert.equal(prepareSpecies(rows, refs, options).impacts[0].values.impact_type, "P-other");
  options.impactTypeBySourceKey[key] = "P-invalid";
  assert.throws(() => prepareSpecies(rows, refs, options), /not a reference candidate/u);
});

test("contextual activity interpretation needs evidence and preserves raw source data", () => {
  const { rows, refs } = fixture();
  rows.activites[0].libactivites = "Autres";
  const before = structuredClone(rows);
  assert.equal(prepareSpecies(rows, refs).impacts[0].values.impact_type, null);
  const key = "onagre-national:descriptionsespeces:4:activites:2";
  const interpretation = {
    label: "Destruction",
    reason: "The source description explicitly names the operation",
    evidence: ["descriptionsespeces:4.cmtactivitesespeces"],
  };
  const options = { activityInterpretationBySourceKey: { [key]: interpretation } };
  assert.equal(prepareSpecies(rows, refs, options).impacts[0].values.impact_type, "P-test");
  assert.deepEqual(rows, before);
  interpretation.evidence = [];
  assert.throws(() => prepareSpecies(rows, refs, options), /reason and evidence/u);
});

test("known species without an activity stay visible with a stable unspecified identity", () => {
  const { rows, refs } = fixture();
  rows.descriptionsespeces_activites = [];
  const prepared = prepareSpecies(rows, refs);
  assert.equal(prepared.impacts.length, 1);
  assert.equal(
    prepared.impacts[0].sourceKey,
    "onagre-national:descriptionsespeces:4:activites:unspecified",
  );
  assert.equal(prepared.impacts[0].values.impact_type, null);
  assert.equal(prepared.issues[0].code, "species-impact-missing");
});

test("resolving an ambiguous activity preserves the impact's source identity", () => {
  const { rows, refs } = fixture();
  refs.types.push({ ...refs.types[0], identifiant_pitchou: "P-other" });
  const unknown = prepareSpecies(rows, refs).impacts[0];
  const resolved = prepareSpecies(rows, refs, {
    impactTypeBySourceKey: { [unknown.sourceKey]: "P-other" },
  }).impacts[0];
  assert.equal(unknown.values.impact_type, null);
  assert.equal(resolved.sourceKey, unknown.sourceKey);
  assert.equal(resolved.values.impact_type, "P-other");
});

test("source notes and sex counts survive an unresolved taxon without inventing impacts", () => {
  const { rows, refs } = fixture();
  rows.especes[0].nomscientifique = "Unresolved taxon";
  Object.assign(rows.descriptionsespeces[0], {
    cmtdescriptionsespeces: "Explicit source detail",
    individufemelles: "0",
    individumale: "12",
  });
  const prepared = prepareSpecies(rows, refs);
  assert.equal(prepared.impacts.length, 0);
  assert(prepared.notes.some((note) => note.includes("Explicit source detail")));
  assert(prepared.notes.some((note) => note.includes("Nombre de femelles indiqué (Onagre) : 0")));
  assert(prepared.notes.some((note) => note.includes("Nombre de mâles indiqué (Onagre) : 12")));
});
