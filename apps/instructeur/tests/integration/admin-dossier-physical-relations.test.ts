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
  const initialDossier = await db("dossier")
    .select("demandeur_personne_physique")
    .where({ id })
    .first();
  const initialPersonneCount = (await db("personne").select("id")).length;
  const relations = {
    groupe_instructeurs: nextGroupe.id as GroupeInstructeursId,
    demandeur_type: "personne_physique" as const,
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
        type: "demandeur" as const,
        last_name: "Martin",
        first_names: "Camille",
        email: "SHARED@example.org",
        phone: null,
        role: null,
      },
      {
        type: "mandataire" as const,
        last_name: "Durand",
        first_names: "Lou",
        email: "lou@example.org",
        phone: null,
        role: null,
      },
    ],
  };
  await updateDossierFromAdmin(id, { relations }, ADMIN_EMAIL, db);
  await updateDossierFromAdmin(id, { relations }, ADMIN_EMAIL, db);
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
  expect(detail.dossier.demandeur_personne_physique).toBe(
    initialDossier?.demandeur_personne_physique,
  );
  expect(detail.dossier.demandeur_personne_physique).not.toBe(existing.id);
  expect((await db("personne").select("id")).length).toBe(initialPersonneCount);
  expect(await db("personne").where({ id: existing.id }).first()).toMatchObject({
    first_names: "Existing",
    last_name: "Account",
    access_code: existing.codeAcces,
  });
});

test("a physical demandeur referenced by another dossier is replaced without being mutated", async () => {
  const instructeur = await createInstructeurWithCapToGroup(db);
  const groupeId = instructeur.groupeId as GroupeInstructeursId;
  const first = await createDossierFromAdmin(
    {
      name: "Dossier with shared demandeur",
      depot_date: new Date("2026-07-11"),
      phase: "Instruction",
      relations: physicalAdminDossierRelations(groupeId, "Shared", "Person"),
    },
    ADMIN_EMAIL,
    db,
  );
  const second = await createDossierFromAdmin(
    {
      name: "Other dossier with shared demandeur",
      depot_date: new Date("2026-07-11"),
      phase: "Instruction",
      relations: physicalAdminDossierRelations(groupeId, "Other", "Person"),
    },
    ADMIN_EMAIL,
    db,
  );
  const firstRow = await db("dossier")
    .select("demandeur_personne_physique")
    .where({ id: first.id })
    .first();
  const secondRow = await db("dossier")
    .select("demandeur_personne_physique")
    .where({ id: second.id })
    .first();
  const sharedId = firstRow?.demandeur_personne_physique;
  if (!sharedId || !secondRow?.demandeur_personne_physique)
    throw new Error("Missing test demandeur");
  await db("dossier")
    .where({ id: second.id })
    .update({ demandeur_personne_physique: sharedId, deposant: sharedId });
  await db("personne").where({ id: secondRow.demandeur_personne_physique }).delete();
  await updateDossierFromAdmin(
    first.id,
    { relations: physicalAdminDossierRelations(groupeId, "Updated", "Demandeur") },
    ADMIN_EMAIL,
    db,
  );
  const updatedFirst = await db("dossier")
    .select("demandeur_personne_physique")
    .where({ id: first.id })
    .first();
  const unchangedSecond = await db("dossier")
    .select("demandeur_personne_physique")
    .where({ id: second.id })
    .first();
  expect(updatedFirst?.demandeur_personne_physique).not.toBe(sharedId);
  expect(unchangedSecond?.demandeur_personne_physique).toBe(sharedId);
  expect(await db("personne").where({ id: sharedId }).first()).toMatchObject({
    first_names: "Person",
    last_name: "Shared",
    access_code: null,
  });
});
