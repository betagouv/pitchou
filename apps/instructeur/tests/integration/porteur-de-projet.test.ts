import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { createDossier, createGroupeInstructeurs } from "../factories/dossier.ts";
import { SIRET, count, morale, physique, porteurOf } from "../factories/porteurDeProjet.ts";

import { synchronizeDossierRelations } from "../../../../libs/worker/synchronization-ds/synchronizeDossierRelations.ts";

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
  expect(await count(db, "porteur_de_projet")).toBe(2);
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
  expect(await count(db, "porteur_de_projet")).toBe(1);

  await db("dossier").where({ id: b.id }).delete();
  expect(await count(db, "porteur_de_projet")).toBe(0);
  expect(await count(db, "entreprise")).toBe(1);
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

  expect(await count(db, "porteur_de_projet")).toBe(0);
  expect(await count(db, "personne_physique")).toBe(1);
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

  expect(await porteurOf(db, dossiers[0].id)).toMatchObject({ last_name: "Martin" });
  expect(await porteurOf(db, dossiers[1].id)).toMatchObject({ personne_morale: SIRET });
});
