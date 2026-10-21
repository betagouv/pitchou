import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { createDossier } from "../factories/dossier.ts";
import { count, physique } from "../factories/porteurDeProjet.ts";

import { savePorteursDeProjetAndActeurs } from "@pitchou/server/database/dossier_acteur.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { DossierActeurData } from "@pitchou/types/dossierActeur.ts";
import type { PorteurDeProjetInitializer } from "@pitchou/types/porteurDeProjet.ts";

function personne(last_name: string, email: string | null = null) {
  return { first_names: "Jean", last_name, email, address: null, phone: null, role: null };
}

async function save(
  dossier: number,
  acteurs: DossierActeurData[],
  porteur: PorteurDeProjetInitializer = undefined,
) {
  return savePorteursDeProjetAndActeurs(
    new Map([[dossier as DossierId, porteur]]),
    new Map([[dossier as DossierId, acteurs]]),
    db,
  );
}

function acteursOf(dossier: number) {
  return db("dossier_acteur")
    .join("personne_physique", "personne_physique.id", "dossier_acteur.personne_physique")
    .select("involvement", "personne_physique", "last_name", "email")
    .where({ dossier })
    .orderBy("involvement");
}

async function loggedFields(dossier: number) {
  const actions = await db("action_dossier").select("data").where({ dossier });
  return actions.map(({ data }) => data.notification_field).sort();
}

test("one personne physique holds several involvements, the porteur is reused, the first acteurs are a baseline", async () => {
  const dossier = await createDossier(db);

  const changed = await save(
    dossier.id,
    [
      { involvements: ["beneficiaire_demarche_numerique"], porteur: true },
      { involvements: ["mandataire", "deposant"], personne: personne("Dupont") },
    ],
    physique("Martin"),
  );

  const rows = await acteursOf(dossier.id);
  const [{ personne_physique: porteur }] =
    await db("porteur_de_projet").select("personne_physique");
  expect(rows).toMatchObject([
    {
      involvement: "beneficiaire_demarche_numerique",
      personne_physique: porteur,
      last_name: "Martin",
    },
    { involvement: "deposant", last_name: "Dupont" },
    { involvement: "mandataire", last_name: "Dupont" },
  ]);
  expect(rows[1].personne_physique).toBe(rows[2].personne_physique);
  expect(await count(db, "personne_physique")).toBe(2);
  expect(changed).toEqual(new Set());
  const actions = await db("action_dossier").select("data").where({ dossier: dossier.id });
  expect(actions.length).toBeGreaterThan(0);
  expect(actions.every(({ data }) => data.baseline === true && !data.notification)).toBe(true);
});

test("an acteur is updated in place, the porteur changes reach the historique, replay changes nothing", async () => {
  const dossier = await createDossier(db);
  const acteurs = (contact: string): DossierActeurData[] => [
    { involvements: ["beneficiaire_demarche_numerique", "deposant"], porteur: true },
    { involvements: ["personne_contact"], personne: personne("Leroy", contact) },
  ];
  await save(dossier.id, acteurs("avant@test.fr"), physique("Martin"));
  const [before] = await acteursOf(dossier.id).where({ involvement: "personne_contact" });
  await db("action_dossier").delete();

  await save(dossier.id, acteurs("apres@test.fr"), physique("Martin-Durand"));

  expect(await acteursOf(dossier.id).where({ involvement: "personne_contact" })).toEqual([
    { ...before, email: "apres@test.fr" },
  ]);
  expect(await count(db, "personne_physique")).toBe(2);
  expect(await loggedFields(dossier.id)).toEqual([
    "beneficiaire_demarche_numerique.last_name",
    "deposant.last_name",
    "personne_contact.email",
  ]);

  await db("action_dossier").delete();
  expect(await save(dossier.id, acteurs("apres@test.fr"), physique("Martin-Durand"))).toEqual(
    new Set(),
  );
  expect(await count(db, "action_dossier")).toBe(0);
});

test("a mandataire removed loses its rows, its personne physique is kept", async () => {
  const dossier = await createDossier(db);
  await save(dossier.id, [
    { involvements: ["beneficiaire_demarche_numerique"], personne: personne("Martin") },
    { involvements: ["mandataire", "deposant"], personne: personne("Dupont") },
  ]);

  await save(dossier.id, [
    { involvements: ["beneficiaire_demarche_numerique", "deposant"], personne: personne("Martin") },
  ]);

  expect(await acteursOf(dossier.id)).toMatchObject([
    { involvement: "beneficiaire_demarche_numerique", last_name: "Martin" },
    { involvement: "deposant", last_name: "Martin" },
  ]);
  expect(await count(db, "personne_physique")).toBe(2);
});

test("deleting a dossier deletes its acteurs", async () => {
  const dossier = await createDossier(db);
  await save(dossier.id, [{ involvements: ["deposant"], personne: personne("Martin") }]);

  await db("dossier").where({ id: dossier.id }).delete();

  expect(await count(db, "dossier_acteur")).toBe(0);
  expect(await count(db, "personne_physique")).toBe(1);
});
