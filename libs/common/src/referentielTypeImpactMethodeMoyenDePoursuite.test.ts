import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

import { buildActivitesMethodesMoyensDePoursuite } from "./especesUtils.ts";
import {
  projectReferentiel,
  REFERENTIEL_ATTENDU,
} from "./referentielTypeImpactMethodeMoyenDePoursuite.fixture.ts";

// Characterization test: it pins the referential as produced today, from the `.ods`, so that
// the database-backed loader that replaces it can be held to the same expected value. The
// assertion is meant to survive that migration untouched — only the producer below changes.

// Not the app's ACTIVITES_METHODES_MOYENS_DE_POURSUITE_DATA: that one is the URL the browser
// fetches, not a path on disk.
const ODS_PATH = join(
  import.meta.dirname,
  "../../../data/activites-methodes-moyens-de-poursuite.ods",
);

const referentiel = await buildActivitesMethodesMoyensDePoursuite(await readFile(ODS_PATH));

describe("referentiel type impact / methode / moyen de poursuite", () => {
  it("has the expected content", () => {
    expect(projectReferentiel(referentiel)).toEqual(REFERENTIEL_ATTENDU);
  });

  it("holds the expected number of entries per classification", () => {
    const counts = <T>(byClassification: Record<string, Map<string, T>>) =>
      Object.fromEntries(Object.entries(byClassification).map(([k, m]) => [k, m.size]));

    expect(counts(referentiel.activités)).toEqual({
      oiseau: 10,
      "faune non-oiseau": 9,
      flore: 2,
    });
    expect(counts(referentiel.méthodes)).toEqual({
      oiseau: 3,
      "faune non-oiseau": 5,
      flore: 0,
    });
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
});
