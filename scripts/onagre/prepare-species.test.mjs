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
});
test("zero quantities remain explicitly pending; duplicate activities are ambiguous", () => {
  const { rows, refs } = fixture();
  rows.descriptionsespeces[0].quantiteespeces = "0";
  const p = prepareSpecies(rows, refs);
  assert.equal(p.impacts[0].values.nombre_individus, null);
  assert.equal(p.issues[0].values.quantiteespeces, "0");
  refs.types.push({ ...refs.types[0], identifiant_pitchou: "P-other" });
  assert.equal(prepareSpecies(rows, refs).impacts.length, 0);
});
test("vehicle approval does not silently extend to birds", () => {
  const { rows, refs } = fixture();
  refs.species[0].classification = "oiseau";
  refs.types[0].classification = "oiseau";
  const p = prepareSpecies(rows, refs, { motorVehicleNonBird: true });
  assert.equal(p.impacts[0].values.impact_moyen_de_poursuite, null);
  assert.equal(p.issues[0].code, "species-method-review");
});
