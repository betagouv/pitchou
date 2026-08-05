import { describe, it, expect } from "vitest";

import { referentielRowsToBundle } from "@pitchou/common/referentielTypeImpactMethodeMoyenDePoursuite.ts";
import {
  projectReferentiel,
  REFERENTIEL_ATTENDU,
} from "@pitchou/common/referentielTypeImpactMethodeMoyenDePoursuite.fixture.ts";

import {
  TYPES_IMPACT,
  METHODES,
  MOYENS_DE_POURSUITE,
} from "./migrations/20260805120000_creation-tables-type-impact-methode-moyen-de-poursuite.ts";

// Characterization test, inherited from the one that pinned the `.ods` parser: the expected value
// is unchanged, only the producer moved to the database. It reads the rows straight from the
// migration rather than from a database, so it stays a unit test and runs in CI, and it covers
// both halves of the move — the transcribed referential and the row-to-bundle mapping the browser
// and the server share. That the database really holds these rows is the integration test's job.

const referentiel = referentielRowsToBundle({
  typesImpact: TYPES_IMPACT,
  methodes: METHODES,
  moyensDePoursuite: MOYENS_DE_POURSUITE,
});

describe("referentiel type impact / methode / moyen de poursuite", () => {
  it("has the expected content", () => {
    expect(projectReferentiel(referentiel)).toEqual(REFERENTIEL_ATTENDU);
  });

  it("holds the expected number of entries per classification", () => {
    const counts = <T>(byClassification: Record<string, Map<string, T>>) =>
      Object.fromEntries(Object.entries(byClassification).map(([k, m]) => [k, m.size]));

    expect(counts(referentiel.activités)).toEqual({ oiseau: 10, "faune non-oiseau": 9, flore: 2 });
    expect(counts(referentiel.méthodes)).toEqual({ oiseau: 3, "faune non-oiseau": 5, flore: 0 });
    expect(counts(referentiel.moyensDePoursuite)).toEqual({
      oiseau: 5,
      "faune non-oiseau": 3,
      flore: 0,
    });
  });

  it("gives every type impact a non-empty European directive label", () => {
    // Left out of the expected value because it runs to 508 characters, but it still lands in
    // the database, so it must not go missing.
    for (const activites of Object.values(referentiel.activités)) {
      for (const activite of activites.values()) {
        expect(activite["Libellé activité directive européenne"]).not.toBe("");
      }
    }
  });

  it("gives every type impact its Onagre correspondence list", () => {
    // The one field whose shape changed on purpose: the `.ods` held the labels as one
    // newline-separated cell, the table holds them as a `text[]`. Not in the expected value, so
    // it is checked here — every type impact had at least one Onagre label.
    for (const typeImpact of TYPES_IMPACT) {
      expect(typeImpact.activites_onagre.length).toBeGreaterThan(0);
      expect(typeImpact.activites_onagre).not.toContain("");
    }
  });

  it("never reuses an identifiant Pitchou across two classifications", () => {
    // The whole model rests on this: an identifiant Pitchou determines the classification, so
    // the criteres applicable to an impact depend on the type impact alone. The code already
    // relies on it — `identifiantPitchouVersActivitéEtImpactsQuantifiés` flattens the three
    // classifications into a single Map and would silently drop an entry on collision.
    const identifiants = Object.values(referentiel.activités).flatMap((activites) => [
      ...activites.keys(),
    ]);

    expect(identifiants).toHaveLength(new Set(identifiants).size);
    expect(referentiel.identifiantPitchouVersActivitéEtImpactsQuantifiés.size).toBe(
      identifiants.length,
    );
  });

  it("gives moyen de poursuite codes that only a classification tells apart", () => {
    // Why `moyen_de_poursuite` has a composite primary key while `methode` does not.
    const codes = MOYENS_DE_POURSUITE.map(({ code }) => code);
    expect(new Set(codes).size).toBeLessThan(codes.length);

    const methodeCodes = METHODES.map(({ code }) => code);
    expect(new Set(methodeCodes).size).toBe(methodeCodes.length);
  });
});
