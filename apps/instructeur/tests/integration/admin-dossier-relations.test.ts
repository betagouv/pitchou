import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";
import { physicalAdminDossierRelations } from "../factories/adminDossier.ts";
import {
  createDossierFromAdmin,
  updateDossierFromAdmin,
} from "@pitchou/server/database/dossier_admin.ts";
import { getDossierDetailForAdmin } from "@pitchou/server/database/dossier_admin_list.ts";

import type { EntrepriseSiret } from "@pitchou/types/database/public/Entreprise.ts";

const ADMIN_EMAIL = "admin-relations@pitchou.test";

test("a native dossier can switch to a legal demandeur without changing shared company data", async () => {
  await createInstructeurWithCapToGroup(db);
  const { id } = await createDossierFromAdmin(
    {
      name: "Dossier personne morale",
      depot_date: new Date("2026-07-12"),
      phase: "Instruction",
      relations: physicalAdminDossierRelations("Initial", "Person"),
    },
    ADMIN_EMAIL,
    db,
  );
  const siret = "12345678901234";
  await db("entreprise").insert({ siret, legal_name: "Nom officiel", siren: siret.slice(0, 9) });

  await updateDossierFromAdmin(
    id,
    {
      relations: {
        demandeur_type: "personne_morale",
        demandeur_personne_physique: null,
        demandeur_personne_morale: {
          siret: siret as EntrepriseSiret,
          legal_name: "Nom non appliqué",
          address: "2 avenue de France",
          postal_code: "75013",
          department: "Paris",
          region: "Île-de-France",
        },
        identites: [
          {
            type: "demandeur",
            last_name: "Petit",
            first_names: "Sam",
            email: "sam@example.org",
            phone: null,
            role: null,
          },
          {
            type: "representant",
            last_name: "Roux",
            first_names: "Alex",
            email: "alex@example.org",
            phone: "0102030405",
            role: "Directrice",
          },
        ],
      },
    },
    ADMIN_EMAIL,
    db,
  );

  const detail = await getDossierDetailForAdmin(id, db);
  expect(detail.porteur_de_projet).toMatchObject({
    type: "personne_morale",
    legal_name: "Nom officiel",
  });
  expect(detail.acteurs).toEqual([
    expect.objectContaining({ involvements: ["deposant"], last_name: "Petit" }),
    expect.objectContaining({ involvements: ["personne_contact"], role: "Directrice" }),
  ]);
});

test("switching demandeur type deletes an unreferenced dossier-specific personne", async () => {
  await createInstructeurWithCapToGroup(db);
  const { id } = await createDossierFromAdmin(
    {
      name: "Dossier personne cleanup",
      depot_date: new Date("2026-07-13"),
      phase: "Instruction",
      relations: physicalAdminDossierRelations("Temporary", "Person"),
    },
    ADMIN_EMAIL,
    db,
  );
  const initialDossier = await db("dossier")
    .select("demandeur_personne_physique")
    .where({ id })
    .first();
  const initialPersonneId = initialDossier?.demandeur_personne_physique;
  expect(initialPersonneId).not.toBeNull();

  await updateDossierFromAdmin(
    id,
    {
      relations: {
        demandeur_type: "personne_morale",
        demandeur_personne_physique: null,
        demandeur_personne_morale: {
          siret: "98765432101234" as EntrepriseSiret,
          legal_name: "Entreprise de test",
          address: null,
          postal_code: null,
          department: null,
          region: null,
        },
        identites: [
          {
            type: "representant",
            last_name: "Roux",
            first_names: "Alex",
            email: "alex@example.org",
            phone: null,
            role: "Directrice",
          },
        ],
      },
    },
    ADMIN_EMAIL,
    db,
  );

  expect(await db("personne").where({ id: initialPersonneId }).first()).toBeUndefined();
});

test("the admin writes the acteurs without historique: the porteur is the déposant without mandataire", async () => {
  const relations = physicalAdminDossierRelations("Martin", "Camille");
  relations.identites.push({
    type: "representant",
    last_name: "Leroy",
    first_names: "Anne",
    email: null,
    phone: "0612345678",
    role: null,
  });
  const { id } = await createDossierFromAdmin(
    {
      name: "Dossier acteurs",
      depot_date: new Date("2026-10-20"),
      phase: "Instruction",
      relations,
    },
    ADMIN_EMAIL,
    db,
  );

  const [{ personne_physique: porteur }] = await db("dossier")
    .join("porteur_de_projet", "porteur_de_projet.id", "dossier.porteur_de_projet")
    .select("porteur_de_projet.personne_physique")
    .where("dossier.id", id);
  expect(
    await db("dossier_acteur").select("involvement", "personne_physique").where({ dossier: id }),
  ).toEqual(
    expect.arrayContaining([
      { involvement: "deposant", personne_physique: porteur },
      { involvement: "personne_contact", personne_physique: expect.any(Number) },
    ]),
  );
  expect(
    await db("action_dossier")
      .where({ dossier: id })
      .whereRaw("data->>'notification_field' like 'personne_contact.%'"),
  ).toEqual([]);
});
