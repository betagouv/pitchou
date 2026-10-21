import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { createDossier } from "../factories/dossier.ts";
import { count, physique } from "../factories/porteurDeProjet.ts";

import { up as fillActeursFromIdentites } from "../../../../libs/database/migrations/20261021120000_fill-dossier-acteur-from-identite-dossier.ts";
import { deleteDossierByDSNumber } from "@pitchou/server/database/dossier.ts";
import { savePorteursDeProjetAndActeurs } from "@pitchou/server/database/dossier_acteur.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

function identite(dossier: number, type: string, last_name: string) {
  return { dossier, type, last_name, first_names: "", email: null, phone: null, role: null };
}

function acteursOf(dossier: number) {
  return db("dossier_acteur")
    .join("personne_physique", "personne_physique.id", "dossier_acteur.personne_physique")
    .select("involvement", "personne_physique", "last_name", "first_names")
    .where({ dossier })
    .orderBy("involvement");
}

test("the migration fills the acteurs of the dossiers not coming from Démarche Numérique", async () => {
  const withMandataire = await createDossier(db, { source: "pitchou" });
  const withPorteur = await createDossier(db, { source: "pitchou" });
  const fromDN = await createDossier(db);
  await savePorteursDeProjetAndActeurs(
    new Map([[withPorteur.id as DossierId, physique("Martin")]]),
    new Map(),
    db,
  );
  await db("identite_dossier").insert([
    identite(withMandataire.id, "demandeur", "Petit"),
    identite(withMandataire.id, "mandataire", "Dupont"),
    identite(withMandataire.id, "representant", "Leroy"),
    identite(withPorteur.id, "demandeur", "Martin"),
    identite(fromDN.id, "mandataire", "Durand"),
  ]);

  await fillActeursFromIdentites(db);

  const rows = await acteursOf(withMandataire.id);
  expect(rows).toMatchObject([
    { involvement: "deposant", last_name: "Dupont", first_names: null },
    { involvement: "mandataire", last_name: "Dupont" },
    { involvement: "personne_contact", last_name: "Leroy" },
  ]);
  expect(rows[0].personne_physique).toBe(rows[1].personne_physique);
  const [{ personne_physique: porteur }] =
    await db("porteur_de_projet").select("personne_physique");
  expect(await acteursOf(withPorteur.id)).toEqual([
    {
      involvement: "deposant",
      personne_physique: porteur,
      last_name: "Martin",
      first_names: "Camille",
    },
  ]);
  expect(await acteursOf(fromDN.id)).toEqual([]);

  await fillActeursFromIdentites(db);
  expect(await count(db, "dossier_acteur")).toBe(4);
});

test("deleting a dossier deletes its personnes physiques that no other dossier references", async () => {
  const deleted = await createDossier(db, { demarche_numerique_number: "910101" });
  const kept = await createDossier(db, { demarche_numerique_number: "910102" });
  await savePorteursDeProjetAndActeurs(
    new Map([
      [deleted.id as DossierId, physique("Martin")],
      [kept.id as DossierId, physique("Durand")],
    ]),
    new Map([
      [
        deleted.id as DossierId,
        [
          { involvements: ["deposant"], porteur: true },
          {
            involvements: ["personne_contact"],
            personne: {
              last_name: "Leroy",
              first_names: null,
              email: null,
              address: null,
              phone: null,
              role: null,
            },
          },
        ],
      ],
      [kept.id as DossierId, [{ involvements: ["deposant"], porteur: true }]],
    ]),
    db,
  );
  expect(await count(db, "personne_physique")).toBe(3);

  await deleteDossierByDSNumber([910101], db);

  expect(await db("personne_physique").pluck("last_name")).toEqual(["Durand"]);
  expect(await acteursOf(kept.id)).toHaveLength(1);
});
