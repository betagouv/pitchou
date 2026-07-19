import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { createDossier, createPersonne } from "../factories/index.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import type { PersonneId } from "@pitchou/types/database/public/Personne.ts";

test("GET /api/stats-publiques exposes named counts and only counts petitionnaires since September 2024", async () => {
  const petitionnaireBeforeSeptember = await createPersonne(db);
  const otherPetitionnaireBeforeSeptember = await createPersonne(db);
  const petitionnaireSinceSeptember = await createPersonne(db);

  await createDossier(db, {
    depot_date: new Date("2024-08-01"),
    demandeur_personne_physique: petitionnaireBeforeSeptember.id as PersonneId,
  });
  await createDossier(db, {
    depot_date: new Date("2024-08-15"),
    demandeur_personne_physique: otherPetitionnaireBeforeSeptember.id as PersonneId,
  });
  await createDossier(db, {
    depot_date: new Date("2024-09-01"),
    demandeur_personne_physique: petitionnaireSinceSeptember.id as PersonneId,
  });

  const response = await fetch(`${INTEGRATION_BASE_URL}/api/stats-publiques`);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    dossierCount: 3,
    controlePhaseDossierCount: 0,
    controlePhaseDossierWithDecisionCount: 0,
    controlePhaseDossierWithoutDecisionCount: 0,
    petitionnaireCountSinceSeptember2024: 1,
    controllablePrescriptionCount: 0,
    prescriptionWithControleCount: 0,
    conformiteStats: {
      nonConformePrescriptionCount: 0,
      tooLatePrescriptionCount: 0,
      prescriptionConformeAfterFirstControleCount: 0,
      prescriptionConformeAfterSecondControleCount: 0,
      prescriptionConformeAfterThirdControleCount: 0,
      prescriptionReturnedToConformiteCount: 0,
    },
    biodiversiteImpactStats: {
      conformePrescriptionCount: 0,
      avoidedSurfaceTotal: 0,
      compensatedSurfaceTotal: 0,
      avoidedNidsCount: 0,
      compensatedNidsCount: 0,
      avoidedIndividusCount: 0,
      compensatedIndividusCount: 0,
    },
  });
});
