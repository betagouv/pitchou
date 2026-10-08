import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { createDossier } from "../factories/dossier.ts";
import { SIRET, count, morale, physique, porteurOf } from "../factories/porteurDeProjet.ts";

import { savePorteursDeProjet } from "@pitchou/server/database/porteur_de_projet.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { PorteurDeProjetData } from "@pitchou/types/porteurDeProjet.ts";

async function sync(entries: [number, PorteurDeProjetData][]) {
  await savePorteursDeProjet(new Map(entries as [DossierId, PorteurDeProjetData][]), db);
}

test("savePorteursDeProjet creates then updates a personne physique in place", async () => {
  const dossier = await createDossier(db);

  await sync([[dossier.id, physique("Martin", "0612345678")]]);
  const created = await porteurOf(db, dossier.id);
  expect(created).toMatchObject({ last_name: "Martin", phone: "0612345678" });

  await sync([[dossier.id, physique("Martin-Durand", null)]]);
  expect(await porteurOf(db, dossier.id)).toMatchObject({
    porteur_de_projet: created.porteur_de_projet,
    personne_physique: created.personne_physique,
    last_name: "Martin-Durand",
    phone: null,
  });
  expect(await count(db, "personne_physique")).toBe(1);
  expect(await count(db, "porteur_de_projet")).toBe(1);
});

test("savePorteursDeProjet shares one porteur between the dossiers of a SIRET", async () => {
  const a = await createDossier(db);
  const b = await createDossier(db);

  await sync([
    [a.id, morale(SIRET)],
    [b.id, morale(SIRET)],
  ]);

  const [porteurA, porteurB] = [await porteurOf(db, a.id), await porteurOf(db, b.id)];
  expect(porteurA).toMatchObject({ personne_morale: SIRET });
  expect(porteurB.porteur_de_projet).toBe(porteurA.porteur_de_projet);
  expect(await count(db, "porteur_de_projet")).toBe(1);
});

test("savePorteursDeProjet creates a SIRET-only entreprise without overwriting an existing one", async () => {
  const other = "98765432100001";
  await db("entreprise").insert({ siret: SIRET, legal_name: "EDF" });
  const a = await createDossier(db);
  const b = await createDossier(db);

  await sync([
    [a.id, morale(SIRET)],
    [b.id, morale(other)],
  ]);

  expect(await db("entreprise").select("siret", "siren", "legal_name").orderBy("siret")).toEqual([
    { siret: SIRET, siren: null, legal_name: "EDF" },
    { siret: other, siren: "987654321", legal_name: null },
  ]);
});

test("savePorteursDeProjet replaces or clears the porteur, the orphan one is deleted", async () => {
  const a = await createDossier(db);
  const b = await createDossier(db);
  await sync([
    [a.id, physique("Martin")],
    [b.id, morale(SIRET)],
  ]);

  await sync([
    [a.id, morale(SIRET)],
    [b.id, undefined],
  ]);

  expect(await porteurOf(db, a.id)).toMatchObject({ personne_morale: SIRET });
  expect((await porteurOf(db, b.id)).porteur_de_projet).toBeNull();
  expect(await count(db, "porteur_de_projet")).toBe(1);
  expect(await count(db, "personne_physique")).toBe(1);
});

test("savePorteursDeProjet writes no historique action", async () => {
  const dossier = await createDossier(db);

  await sync([[dossier.id, physique("Martin")]]);
  await sync([[dossier.id, physique("Durand")]]);

  expect(await count(db, "action_dossier")).toBe(0);
});
