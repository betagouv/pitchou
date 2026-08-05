import { expect, test } from "vitest";

import {
  projectReferentiel,
  REFERENTIEL_ATTENDU,
} from "@pitchou/common/referentielTypeImpactMethodeMoyenDePoursuite.fixture.ts";
import { getReferentielTypeImpactMethodeMoyenDePoursuite } from "@pitchou/server/referentielTypeImpactMethodeMoyenDePoursuite.ts";

import { db } from "../setup/db.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

// The referential is not seeded here: the migrations fill the three tables, so what these tests
// read is what a fresh database really holds. Where the unit test pins the rows the migration
// declares, these pin the schema and the query that read them back.

test("le référentiel en base a le contenu attendu", async () => {
  const referentiel = await getReferentielTypeImpactMethodeMoyenDePoursuite(db);

  expect(projectReferentiel(referentiel)).toEqual(REFERENTIEL_ATTENDU);
});

test("GET /api/referentiel-type-impact-methode-moyen-de-poursuite renvoie les lignes en JSON", async () => {
  // No auth header: like /api/especes-protegees, the referential is intentionally public.
  const res = await fetch(
    `${INTEGRATION_BASE_URL}/api/referentiel-type-impact-methode-moyen-de-poursuite`,
  );

  expect(res.status).toBe(200);
  const body = await res.json();

  expect(body.typesImpact).toHaveLength(21);
  expect(body.methodes).toHaveLength(8);
  expect(body.moyensDePoursuite).toHaveLength(8);

  // The contract the browser relies on to rebuild the bundle: raw rows, criteres as booleans,
  // the Onagre labels as an array after JSON.
  const captureOiseau = body.typesImpact.find(
    (t: { identifiant_pitchou: string }) => t.identifiant_pitchou === "P-2-1",
  );
  expect(captureOiseau).toMatchObject({
    code_europeen: "2",
    classification: "oiseau",
    libelle_pitchou: "Capture pour captivité temporaire ou définitive",
    critere_methode: true,
    critere_moyen_de_poursuite: true,
    critere_nids: true,
  });
  expect(captureOiseau.activites_onagre).toContain("Capture pour conserver en captivité");
});
