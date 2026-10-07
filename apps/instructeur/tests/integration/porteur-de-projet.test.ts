import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { createDossier, createGroupeInstructeurs } from "../factories/dossier.ts";

import { syncPorteursDeProjet } from "@pitchou/server/database/porteur_de_projet.ts";
import { synchronizeDossierRelations } from "../../../../libs/worker/synchronization-ds/synchronizeDossierRelations.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { PorteurDeProjetData } from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";

const SIRET = "12345678900001";

function physique(last_name: string, phone: string | null = null): PorteurDeProjetData {
  return {
    personne_physique: {
      first_names: "Camille",
      last_name,
      email: "camille@test.fr",
      address: null,
      phone,
      role: null,
    },
  };
}

function morale(siret: string): PorteurDeProjetData {
  return { personne_morale: siret } as PorteurDeProjetData;
}

async function sync(entries: [number, PorteurDeProjetData][]) {
  await syncPorteursDeProjet(new Map(entries as [DossierId, PorteurDeProjetData][]), db);
}

async function porteurOf(dossierId: number) {
  return db("dossier")
    .leftJoin("porteur_de_projet", "porteur_de_projet.id", "dossier.porteur_de_projet")
    .leftJoin("personne_physique", "personne_physique.id", "porteur_de_projet.personne_physique")
    .select(
      "dossier.porteur_de_projet",
      "porteur_de_projet.personne_morale",
      "porteur_de_projet.personne_physique",
      "personne_physique.last_name",
      "personne_physique.phone",
    )
    .where("dossier.id", dossierId)
    .first();
}

async function count(table: string): Promise<number> {
  const [{ count }] = await db(table).count();
  return Number(count);
}

test("a porteur references exactly one personne physique or personne morale", async () => {
  await db("entreprise").insert({ siret: SIRET });
  const [{ id: personnePhysique }] = await db("personne_physique")
    .insert({ last_name: "Martin" })
    .returning("id");

  await expect(db("porteur_de_projet").insert({})).rejects.toThrow(/porteur_de_projet_check/);
  await expect(
    db("porteur_de_projet").insert({
      personne_physique: personnePhysique,
      personne_morale: SIRET,
    }),
  ).rejects.toThrow(/porteur_de_projet_check/);
  await db("porteur_de_projet").insert([
    { personne_physique: personnePhysique },
    { personne_morale: SIRET },
  ]);
  expect(await count("porteur_de_projet")).toBe(2);
});

test("a porteur is deleted once no dossier references it, its personne and entreprise are kept", async () => {
  await db("entreprise").insert({ siret: SIRET });
  const [{ id: porteur }] = await db("porteur_de_projet")
    .insert({ personne_morale: SIRET })
    .returning("id");
  const a = await createDossier(db, { porteur_de_projet: porteur });
  const b = await createDossier(db, { porteur_de_projet: porteur });

  await db("dossier").where({ id: a.id }).update({ porteur_de_projet: null });
  await db("dossier").where({ id: b.id }).update({ name: "Autre nom" });
  expect(await count("porteur_de_projet")).toBe(1);

  await db("dossier").where({ id: b.id }).delete();
  expect(await count("porteur_de_projet")).toBe(0);
  expect(await count("entreprise")).toBe(1);
});

test("a porteur is deleted when its last dossier changes of porteur", async () => {
  const [{ id: personnePhysique }] = await db("personne_physique")
    .insert({ last_name: "Martin" })
    .returning("id");
  const [{ id: porteur }] = await db("porteur_de_projet")
    .insert({ personne_physique: personnePhysique })
    .returning("id");
  const dossier = await createDossier(db, { porteur_de_projet: porteur });

  await db("dossier").where({ id: dossier.id }).update({ porteur_de_projet: null });

  expect(await count("porteur_de_projet")).toBe(0);
  expect(await count("personne_physique")).toBe(1);
});

test("syncPorteursDeProjet creates then updates a personne physique in place", async () => {
  const dossier = await createDossier(db);

  await sync([[dossier.id, physique("Martin", "0612345678")]]);
  const created = await porteurOf(dossier.id);
  expect(created).toMatchObject({ last_name: "Martin", phone: "0612345678" });

  await sync([[dossier.id, physique("Martin-Durand", null)]]);
  expect(await porteurOf(dossier.id)).toMatchObject({
    porteur_de_projet: created.porteur_de_projet,
    personne_physique: created.personne_physique,
    last_name: "Martin-Durand",
    phone: null,
  });
  expect(await count("personne_physique")).toBe(1);
  expect(await count("porteur_de_projet")).toBe(1);
});

test("syncPorteursDeProjet shares one porteur between the dossiers of a SIRET", async () => {
  const a = await createDossier(db);
  const b = await createDossier(db);

  await sync([
    [a.id, morale(SIRET)],
    [b.id, morale(SIRET)],
  ]);

  const [porteurA, porteurB] = [await porteurOf(a.id), await porteurOf(b.id)];
  expect(porteurA).toMatchObject({ personne_morale: SIRET });
  expect(porteurB.porteur_de_projet).toBe(porteurA.porteur_de_projet);
  expect(await count("porteur_de_projet")).toBe(1);
});

test("syncPorteursDeProjet creates a SIRET-only entreprise without overwriting an existing one", async () => {
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

test("syncPorteursDeProjet replaces or clears the porteur, the orphan one is deleted", async () => {
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

  expect(await porteurOf(a.id)).toMatchObject({ personne_morale: SIRET });
  expect((await porteurOf(b.id)).porteur_de_projet).toBeNull();
  expect(await count("porteur_de_projet")).toBe(1);
  expect(await count("personne_physique")).toBe(1);
});

test("syncPorteursDeProjet writes no historique action", async () => {
  const dossier = await createDossier(db);

  await sync([[dossier.id, physique("Martin")]]);
  await sync([[dossier.id, physique("Durand")]]);

  expect(await count("action_dossier")).toBe(0);
});

test("the Démarche Numérique synchronization of the relations stores the porteur", async () => {
  const groupe = await createGroupeInstructeurs(db);
  const numbers = [101, 102];
  const dossiers = [];
  for (const number of numbers) {
    dossiers.push(
      await createDossier(db, {
        demarche_numerique_number: String(number),
        demarche_numerique_id: `DN-${number}`,
      }),
    );
  }
  const dossiersDS = numbers.map((number) => ({
    id: `DN-${number}`,
    number,
    groupeInstructeur: { label: groupe.name },
    messages: [
      {
        id: `message-${number}`,
        body: "Dossier déposé",
        createdAt: new Date().toISOString(),
        email: "contact@demarche.numerique.gouv.fr",
      },
    ],
  }));
  const dossiersForSync = numbers.map((number, index) => ({
    dossier: {
      demarche_numerique_number: String(number),
      identites: [],
      porteur_de_projet: index === 0 ? physique("Martin") : morale(SIRET),
    },
  }));

  await db.transaction(async (trx) => {
    const { identitesSynchronization, synchronizations } = await synchronizeDossierRelations(
      dossiersDS as unknown as Parameters<typeof synchronizeDossierRelations>[0],
      dossiersForSync as unknown as Parameters<typeof synchronizeDossierRelations>[1],
      88444,
      trx,
    );
    await Promise.all([identitesSynchronization, ...synchronizations]);
  });

  expect(await porteurOf(dossiers[0].id)).toMatchObject({ last_name: "Martin" });
  expect(await porteurOf(dossiers[1].id)).toMatchObject({ personne_morale: SIRET });
});
