import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { createDossier } from "../factories/dossier.ts";
import { deleteDossierByDSNumber, dumpDossiers } from "@pitchou/server/database/dossier.ts";
import type { DossierForUpdate } from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";

// Dossiers created directly in Pitchou (demarche_numerique_number IS NULL) must
// be invisible to the DN synchronization: its updates and deletions are keyed
// on demarche_numerique_number only. These tests lock that guarantee in.

test("la mise à jour de la synchronisation DN ne touche pas les dossiers créés dans Pitchou", async () => {
  const nativeDossier = await createDossier(db, {
    name: "Dossier né dans Pitchou",
    demarche_numerique_number: null,
    demarche_number: null,
  });
  const dnDossier = await createDossier(db, {
    name: "Dossier venu de DN",
    demarche_numerique_number: "910001",
  });

  const update: DossierForUpdate = {
    dossier: { demarche_numerique_number: "910001", name: "Nom écrasé par la sync" },
    evenement_phase_dossier: [],
    decision_administrative: [],
  };
  await dumpDossiers([], [update], db);

  const nativeAfter = await db("dossier").where({ id: nativeDossier.id }).first();
  const dnAfter = await db("dossier").where({ id: dnDossier.id }).first();

  expect(nativeAfter.name).toBe("Dossier né dans Pitchou");
  expect(dnAfter.name).toBe("Nom écrasé par la sync");
});

test("la suppression pilotée par DN ne touche pas les dossiers créés dans Pitchou", async () => {
  const nativeDossier = await createDossier(db, {
    name: "Dossier né dans Pitchou",
    demarche_numerique_number: null,
    demarche_number: null,
  });
  const dnDossier = await createDossier(db, {
    name: "Dossier venu de DN",
    demarche_numerique_number: "910002",
  });

  await deleteDossierByDSNumber([910002], db);

  const nativeAfter = await db("dossier").where({ id: nativeDossier.id }).first();
  const dnAfter = await db("dossier").where({ id: dnDossier.id }).first();

  expect(nativeAfter).toBeDefined();
  expect(dnAfter).toBeUndefined();
});
