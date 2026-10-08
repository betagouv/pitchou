import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { attachDossierToGroupe, createDossier } from "../factories/dossier.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { SIRET, morale, physique } from "../factories/porteurDeProjet.ts";

import { getDossierFull, getDossiersSummariesByCap } from "@pitchou/server/database/dossier.ts";
import { listDossiersForAdmin } from "@pitchou/server/database/dossier_admin_list.ts";
import { savePorteursDeProjet } from "@pitchou/server/database/porteur_de_projet.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { CapDossierCap } from "@pitchou/types/database/public/CapDossier.ts";

test("the dossiers read by the instructeurs carry their porteur de projet object", async () => {
  const instructeur = await createInstructeurWithDossier(db);
  const cap = instructeur.cap as CapDossierCap;
  const physiqueId = instructeur.dossier.id as DossierId;
  const moraleId = (await createDossier(db)).id as DossierId;
  const sansPorteurId = (await createDossier(db)).id as DossierId;
  await attachDossierToGroupe(db, moraleId, instructeur.groupeId);
  await attachDossierToGroupe(db, sansPorteurId, instructeur.groupeId);
  await db("entreprise").insert({ siret: SIRET, legal_name: "EDF", address: "2 rue B" });
  await savePorteursDeProjet(
    new Map([
      [physiqueId, physique("Martin", "0612345678")],
      [moraleId, morale(SIRET)],
    ]),
    db,
  );

  const summaries = await getDossiersSummariesByCap(cap, db);
  const porteurOf = (id: DossierId) => summaries.find((summary) => summary.id === id)!;
  expect(porteurOf(physiqueId).porteur_de_projet).toMatchObject({
    type: "personne_physique",
    last_name: "Martin",
    first_names: "Camille",
  });
  expect(porteurOf(moraleId).porteur_de_projet).toMatchObject({
    type: "personne_morale",
    siret: SIRET,
    legal_name: "EDF",
  });
  expect(porteurOf(sansPorteurId).porteur_de_projet).toBeNull();
  expect(Object.keys(porteurOf(physiqueId)).filter((key) => key.startsWith("porteur_"))).toEqual([
    "porteur_de_projet",
  ]);

  const full = await getDossierFull(physiqueId, cap, db);
  expect(full?.porteur_de_projet).toEqual({
    type: "personne_physique",
    first_names: "Camille",
    last_name: "Martin",
    email: "camille@test.fr",
    address: null,
    phone: "0612345678",
    role: null,
  });
  expect((await getDossierFull(moraleId, cap, db))?.porteur_de_projet).toMatchObject({
    type: "personne_morale",
    address: "2 rue B",
  });
});

test("the admin search finds a dossier by its porteur de projet", async () => {
  const physiqueId = (await createDossier(db, { name: "Dossier A" })).id as DossierId;
  const moraleId = (
    await createDossier(db, { name: "Dossier B", demarche_numerique_number: "99001" })
  ).id as DossierId;
  await db("entreprise").insert({ siret: SIRET, legal_name: "Pichet Immobilier" });
  await savePorteursDeProjet(
    new Map([
      [physiqueId, physique("Martin")],
      [moraleId, morale(SIRET)],
    ]),
    db,
  );
  const found = async (search: string) =>
    (await listDossiersForAdmin({ page: 1, pageSize: 50, search }, db)).dossiers.map(
      ({ id }) => id,
    );

  expect(await found("pichet")).toEqual([moraleId]);
  expect(await found("123 456 789 00001")).toEqual([moraleId]);
  expect(await found("martin")).toEqual([physiqueId]);
  expect(await found("camille")).toEqual([physiqueId]);
  // A word no longer breaks the query on the bigint DN number, which stays searchable.
  expect(await found("Dossier A")).toEqual([physiqueId]);
  expect(await found("99001")).toEqual([moraleId]);
});
