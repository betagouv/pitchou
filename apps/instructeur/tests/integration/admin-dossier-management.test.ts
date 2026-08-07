import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import {
  createDossier as createDossierRow,
  createInstructeurWithCapToGroup,
} from "../factories/index.ts";
import { physicalAdminDossierRelations } from "../factories/adminDossier.ts";
import {
  createDossierFromAdmin,
  updateDossierFromAdmin,
  deleteDossierFromAdmin,
  DossierManagedByDnError,
  DossierNotCreatedInPitchouError,
  DossierUnknownSourceError,
} from "@pitchou/server/database/dossier_admin.ts";
import {
  getDossierDetailForAdmin,
  listDossiersForAdmin,
} from "@pitchou/server/database/dossier_admin_list.ts";
import { getDossierFull, getDossiersSummariesByCap } from "@pitchou/server/database/dossier.ts";

import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { CapDossierCap } from "@pitchou/types/database/public/CapDossier.ts";
import type { GroupeInstructeursId } from "@pitchou/types/database/public/GroupeInstructeurs.ts";

const ADMIN_EMAIL = "admin-dossiers@pitchou.test";

test("un dossier créé depuis l'admin est visible par les instructeurs de son groupe", async () => {
  const instructeur = await createInstructeurWithCapToGroup(db);

  const { id } = await createDossierFromAdmin(
    {
      name: "Dossier né dans Pitchou",
      depot_date: new Date("2026-07-01"),
      phase: "Instruction",
      relations: physicalAdminDossierRelations(
        instructeur.groupeId as GroupeInstructeursId,
        "Martin",
        "Camille",
        "camille.martin@example.org",
      ),
      columns: {
        urgent_contact_phone: "0612345678",
        request_context: "Vous souhaitez bénéficier d'un accompagnement amont",
        accompaniment_need: "Cadrer le contenu attendu du dossier",
        location_scope: "france",
        primary_department: "69",
        departments: [],
        communes: [],
        regions: [],
      },
    },
    ADMIN_EMAIL,
    db,
  );

  const detail = await getDossierDetailForAdmin(id, db);
  expect(detail.managedByDn).toBe(false);
  expect(detail.source).toBe("pitchou");
  expect(detail.dossier.source).toBe("pitchou");
  expect(detail.phase).toBe("Instruction");
  expect(detail.groupe?.id).toBe(instructeur.groupeId);
  expect(detail.demandeur_personne_physique?.last_name).toBe("Martin");
  expect(detail.dossier).toMatchObject({
    urgent_contact_phone: "0612345678",
    request_context: "Vous souhaitez bénéficier d'un accompagnement amont",
    accompaniment_need: "Cadrer le contenu attendu du dossier",
  });
  // Keep the admin's personne so the event is not filtered out as sync noise.
  expect(detail.evenementsPhase).toHaveLength(1);
  expect(detail.evenementsPhase[0].caused_by_email).toBe(ADMIN_EMAIL);

  // The instructeurs of the groupe see the dossier through their cap.
  const summaries = await getDossiersSummariesByCap(instructeur.cap as CapDossierCap, db);
  expect(summaries.map((summary) => summary.id)).toContain(id);
  expect(summaries.find((summary) => summary.id === id)).toMatchObject({
    source: "pitchou",
    location_scope: "france",
    primary_department: "69",
  });
  expect(await getDossierFull(id, instructeur.cap as CapDossierCap, db)).toMatchObject({
    location_scope: "france",
    primary_department: "69",
  });

  // The "pitchou" source filter finds it, the "dn" filter does not.
  const pitchouOnly = await listDossiersForAdmin({ page: 1, pageSize: 200, source: "pitchou" }, db);
  expect(pitchouOnly.dossiers.map((dossier) => dossier.id)).toContain(id);
  const dnOnly = await listDossiersForAdmin({ page: 1, pageSize: 200, source: "dn" }, db);
  expect(dnOnly.dossiers.map((dossier) => dossier.id)).not.toContain(id);
});

test("modification admin d'un dossier natif : champs DN-derivés et changement de phase", async () => {
  const instructeur = await createInstructeurWithCapToGroup(db);
  const groupeId = instructeur.groupeId as GroupeInstructeursId;
  const { id } = await createDossierFromAdmin(
    {
      name: "Dossier à modifier",
      depot_date: new Date("2026-07-02"),
      phase: "Accompagnement amont",
      relations: physicalAdminDossierRelations(groupeId, "Durand", "Alex"),
    },
    ADMIN_EMAIL,
    db,
  );

  await updateDossierFromAdmin(
    id,
    {
      columns: { name: "Nom modifié par l'admin", description: "Nouvelle description" },
      // Avoid tying with the second-precision creation event.
      evenementsPhase: [{ phase: "Contrôle", timestamp: new Date(Date.now() + 60_000) }],
    },
    ADMIN_EMAIL,
    db,
  );

  const detail = await getDossierDetailForAdmin(id, db);
  expect(detail.dossier.name).toBe("Nom modifié par l'admin");
  expect(detail.dossier.description).toBe("Nouvelle description");
  expect(detail.phase).toBe("Contrôle");
});

test("les champs importés de DN sont refusés en modification sur un dossier synchronisé", async () => {
  const dnDossier = await createDossierRow(db, { demarche_numerique_number: "910100" });
  const dossierId = dnDossier.id as DossierId;

  await expect(
    updateDossierFromAdmin(dossierId, { columns: { name: "Nom écrasé" } }, ADMIN_EMAIL, db),
  ).rejects.toBeInstanceOf(DossierManagedByDnError);

  // The columns owned by Pitchou stay editable on DN-synced dossiers.
  await updateDossierFromAdmin(
    dossierId,
    { columns: { free_comment: "note d'instruction" } },
    ADMIN_EMAIL,
    db,
  );
  const row = await db("dossier").where({ id: dossierId }).first();
  expect(row.free_comment).toBe("note d'instruction");
  expect(row.name).toBe("Dossier de test");
});

test("la provenance explicite distingue DN sans numéro, Pitchou et source inconnue", async () => {
  const dnWithoutNumber = await createDossierRow(db, {
    source: "demarche_numerique",
    demarche_numerique_number: null,
  });
  const unknown = await createDossierRow(db, {
    source: "unknown",
    demarche_numerique_number: null,
  });

  const dnOnly = await listDossiersForAdmin({ page: 1, pageSize: 200, source: "dn" }, db);
  expect(dnOnly.dossiers.map(({ id }) => id)).toContain(dnWithoutNumber.id);
  expect(dnOnly.dossiers.map(({ id }) => id)).not.toContain(unknown.id);

  const unknownOnly = await listDossiersForAdmin({ page: 1, pageSize: 200, source: "unknown" }, db);
  expect(unknownOnly.dossiers.map(({ id }) => id)).toContain(unknown.id);

  await expect(
    updateDossierFromAdmin(
      unknown.id as DossierId,
      { columns: { free_comment: "Ne doit pas être appliqué" } },
      ADMIN_EMAIL,
      db,
    ),
  ).rejects.toBeInstanceOf(DossierUnknownSourceError);
  await expect(deleteDossierFromAdmin(unknown.id as DossierId, db)).rejects.toBeInstanceOf(
    DossierNotCreatedInPitchouError,
  );
});
