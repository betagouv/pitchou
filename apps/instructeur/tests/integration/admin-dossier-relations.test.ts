import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import {
  createGroupeInstructeurs,
  createInstructeurWithCapToGroup,
  createPersonne,
} from "../factories/index.ts";
import { physicalAdminDossierRelations } from "../factories/adminDossier.ts";
import {
  createDossierFromAdmin,
  updateDossierFromAdmin,
} from "@pitchou/server/database/dossier_admin.ts";
import { getDossierDetailForAdmin } from "@pitchou/server/database/dossier_admin_list.ts";

import type { GroupeInstructeursId } from "@pitchou/types/database/public/GroupeInstructeurs.ts";
import type { EntrepriseSiret } from "@pitchou/types/database/public/Entreprise.ts";

const ADMIN_EMAIL = "admin-relations@pitchou.test";

test("a native dossier can change groupe and physical demandeur without mutating an account", async () => {
  const instructeur = await createInstructeurWithCapToGroup(db);
  const nextGroupe = await createGroupeInstructeurs(db, { name: "Nouveau groupe" });
  const existing = await createPersonne(db, {
    email: "shared@example.org",
    first_names: "Existing",
    last_name: "Account",
  });
  const { id } = await createDossierFromAdmin(
    {
      name: "Dossier relations",
      depot_date: new Date("2026-07-11"),
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

  await updateDossierFromAdmin(
    id,
    {
      relations: {
        groupe_instructeurs: nextGroupe.id as GroupeInstructeursId,
        demandeur_type: "personne_physique",
        demandeur_personne_physique: {
          last_name: "Martin",
          first_names: "Camille",
          email: "SHARED@example.org",
          address: "1 rue des Lilas\n69001 Lyon",
          phone: "0102030405",
          role: "Ecologue",
        },
        demandeur_personne_morale: null,
        identites: [
          {
            type: "demandeur",
            last_name: "Martin",
            first_names: "Camille",
            email: "SHARED@example.org",
            phone: null,
            role: null,
          },
          {
            type: "mandataire",
            last_name: "Durand",
            first_names: "Lou",
            email: "lou@example.org",
            phone: null,
            role: null,
          },
        ],
      },
    },
    ADMIN_EMAIL,
    db,
  );

  const detail = await getDossierDetailForAdmin(id, db);
  expect(detail.groupe?.id).toBe(nextGroupe.id);
  expect(detail.demandeur_personne_physique).toMatchObject({
    last_name: "Martin",
    first_names: "Camille",
    email: null,
    role: "Ecologue",
  });
  expect(detail.identites).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ type: "demandeur", email: "shared@example.org" }),
      expect.objectContaining({ type: "mandataire", last_name: "Durand" }),
    ]),
  );
  expect(detail.dossier.demandeur_personne_physique).not.toBe(existing.id);
  expect(await db("personne").where({ id: existing.id }).first()).toMatchObject({
    first_names: "Existing",
    last_name: "Account",
    access_code: existing.codeAcces,
  });
});

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
