import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { createDossier } from "../factories/dossier.ts";
import { deleteDossierByDSNumber, dumpDossiers } from "@pitchou/server/database/dossier.ts";
import { synchronizeFichiersEspecesImpacteesFromDS88444 } from "@pitchou/server/database/especes_impactees.ts";
import type { DossierForUpdate } from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

// Only dossiers explicitly sourced from DN may be updated or deleted by its synchronization.

test("la mise à jour de la synchronisation DN ne touche pas les dossiers créés dans Pitchou", async () => {
  const nativeDossier = await createDossier(db, {
    name: "Dossier né dans Pitchou",
    source: "pitchou",
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
    source: "pitchou",
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

test("la suppression DN ignore un dossier Pitchou même s'il porte un ancien numéro DN", async () => {
  const nativeDossier = await createDossier(db, {
    name: "Dossier Pitchou avec métadonnée historique",
    source: "pitchou",
    demarche_numerique_number: "910003",
    demarche_number: null,
  });

  await deleteDossierByDSNumber([910003], db);

  expect(await db("dossier").where({ id: nativeDossier.id }).first()).toBeDefined();
});

test("la synchronisation du fichier espèces ignore un dossier Pitchou avec un ancien numéro DN", async () => {
  const nativeDossier = await createDossier(db, {
    name: "Dossier Pitchou avec métadonnée historique",
    source: "pitchou",
    demarche_numerique_number: "910004",
    demarche_number: null,
  });

  await synchronizeFichiersEspecesImpacteesFromDS88444(
    new Map([[910004, "00000000-0000-0000-0000-000000000001" as FileId]]),
    // Empty on purpose: the dossier is a Pitchou one, so the synchronization has no id for that
    // Démarche Numérique number and nothing may be imported for it.
    new Map(),
    db,
  );

  const dossierAfter = await db("dossier").where({ id: nativeDossier.id }).first();
  expect(dossierAfter.especes_impactees).toBeNull();
});
