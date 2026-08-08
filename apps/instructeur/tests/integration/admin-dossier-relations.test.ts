import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";
import { physicalAdminDossierRelations } from "../factories/adminDossier.ts";
import {
  createDossierFromAdmin,
  updateDossierFromAdmin,
} from "@pitchou/server/database/dossier_admin.ts";
import { getDossierDetailForAdmin } from "@pitchou/server/database/dossier_admin_list.ts";

import type { GroupeInstructeursId } from "@pitchou/types/database/public/GroupeInstructeurs.ts";
import type { EntrepriseSiret } from "@pitchou/types/database/public/Entreprise.ts";

const ADMIN_EMAIL = "admin-relations@pitchou.test";

test("a native dossier can switch to a legal demandeur without changing shared company data", async () => {
  const instructeur = await createInstructeurWithCapToGroup(db);
  const { id } = await createDossierFromAdmin(
    {
      name: "Dossier personne morale",
      depot_date: new Date("2026-07-12"),
      phase: "Instruction",
      relations: physicalAdminDossierRelations(
        instructeur.groupeId as GroupeInstructeursId,
        "Initial",
        "Person",
      ),
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
        groupe_instructeurs: instructeur.groupeId as GroupeInstructeursId,
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
  expect(detail.demandeur_personne_physique).toBeNull();
  expect(detail.demandeur_personne_morale?.legal_name).toBe("Nom officiel");
  expect(detail.identites).toEqual(
    expect.arrayContaining([expect.objectContaining({ type: "representant", role: "Directrice" })]),
  );
});

test("switching demandeur type deletes an unreferenced dossier-specific personne", async () => {
  const instructeur = await createInstructeurWithCapToGroup(db);
  const { id } = await createDossierFromAdmin(
    {
      name: "Dossier personne cleanup",
      depot_date: new Date("2026-07-13"),
      phase: "Instruction",
      relations: physicalAdminDossierRelations(
        instructeur.groupeId as GroupeInstructeursId,
        "Temporary",
        "Person",
      ),
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
        groupe_instructeurs: instructeur.groupeId as GroupeInstructeursId,
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
