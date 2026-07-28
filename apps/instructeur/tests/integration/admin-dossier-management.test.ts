import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { getTestS3 } from "../setup/s3.ts";
import {
  createDossier as createDossierRow,
  createInstructeurWithCapToGroup,
} from "../factories/index.ts";
import {
  createDossierFromAdmin,
  updateDossierFromAdmin,
  deleteDossierFromAdmin,
  DossierManagedByDnError,
} from "@pitchou/server/database/dossier_admin.ts";
import {
  getDossierDetailForAdmin,
  listDossiersForAdmin,
} from "@pitchou/server/database/dossier_admin_list.ts";
import {
  addPieceJointeFromAdmin,
  deletePieceJointeFromAdmin,
} from "@pitchou/server/database/dossier_admin_files.ts";
import { getDossiersSummariesByCap } from "@pitchou/server/database/dossier.ts";

import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { GroupeInstructeursId } from "@pitchou/types/database/public/GroupeInstructeurs.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

const ADMIN_EMAIL = "admin-dossiers@pitchou.test";

test("un dossier créé depuis l'admin est visible par les instructeurs de son groupe", async () => {
  const instructeur = await createInstructeurWithCapToGroup(db);

  const { id } = await createDossierFromAdmin(
    {
      name: "Dossier né dans Pitchou",
      depot_date: new Date("2026-07-01"),
      phase: "Instruction",
      groupe_instructeurs: instructeur.groupeId as GroupeInstructeursId,
      demandeur_personne_physique: {
        last_name: "Martin",
        first_names: "Camille",
        email: "camille.martin@example.org",
      },
    },
    ADMIN_EMAIL,
    db,
  );

  const detail = await getDossierDetailForAdmin(id, db);
  expect(detail.managedByDn).toBe(false);
  expect(detail.phase).toBe("Instruction");
  expect(detail.groupe?.id).toBe(instructeur.groupeId);
  expect(detail.demandeur_personne_physique?.last_name).toBe("Martin");
  // The initial phase event must carry the admin's personne, otherwise it would
  // be filtered out as sync noise everywhere in the app.
  expect(detail.evenementsPhase).toHaveLength(1);
  expect(detail.evenementsPhase[0].caused_by_email).toBe(ADMIN_EMAIL);

  // The instructeurs of the groupe see the dossier through their cap.
  const summaries = await getDossiersSummariesByCap(instructeur.cap, db);
  expect(summaries.map((summary) => summary.id)).toContain(id);

  // The "pitchou" source filter finds it, the "dn" filter does not.
  const pitchouOnly = await listDossiersForAdmin({ page: 1, pageSize: 200, source: "pitchou" }, db);
  expect(pitchouOnly.dossiers.map((dossier) => dossier.id)).toContain(id);
  const dnOnly = await listDossiersForAdmin({ page: 1, pageSize: 200, source: "dn" }, db);
  expect(dnOnly.dossiers.map((dossier) => dossier.id)).not.toContain(id);
});

test("modification admin d'un dossier natif : champs DN-derivés et changement de phase", async () => {
  const instructeur = await createInstructeurWithCapToGroup(db);
  const { id } = await createDossierFromAdmin(
    {
      name: "Dossier à modifier",
      depot_date: new Date("2026-07-02"),
      phase: "Accompagnement amont",
      groupe_instructeurs: instructeur.groupeId as GroupeInstructeursId,
      demandeur_personne_physique: { last_name: "Durand", first_names: "Alex" },
    },
    ADMIN_EMAIL,
    db,
  );

  await updateDossierFromAdmin(
    id,
    {
      columns: { name: "Nom modifié par l'admin", description: "Nouvelle description" },
      // The timestamp column has second precision: an event in the same second as
      // the creation event would tie in the "latest phase" ordering. Real phase
      // changes happen later, so pick a clearly later timestamp.
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

test("suppression admin : refusée sur un dossier DN, effective sur un dossier natif", async () => {
  const dnDossier = await createDossierRow(db, { demarche_numerique_number: "910101" });
  await expect(deleteDossierFromAdmin(dnDossier.id as DossierId, db)).rejects.toBeInstanceOf(
    DossierManagedByDnError,
  );

  const instructeur = await createInstructeurWithCapToGroup(db);
  const { id } = await createDossierFromAdmin(
    {
      name: "Dossier à supprimer",
      depot_date: new Date("2026-07-03"),
      phase: "Accompagnement amont",
      groupe_instructeurs: instructeur.groupeId as GroupeInstructeursId,
      demandeur_personne_physique: { last_name: "Petit", first_names: "Lou" },
    },
    ADMIN_EMAIL,
    db,
  );

  await deleteDossierFromAdmin(id, db);

  expect(await db("dossier").where({ id }).first()).toBeUndefined();
  expect(await db("evenement_phase_dossier").where({ dossier: id })).toHaveLength(0);
});

test("pièces jointes admin : ajout/suppression sur dossier natif, refus sur dossier DN", async () => {
  await getTestS3(); // provisions the bucket and the AWS_* env vars used by the server layer

  const instructeur = await createInstructeurWithCapToGroup(db);
  const { id } = await createDossierFromAdmin(
    {
      name: "Dossier avec pièces jointes",
      depot_date: new Date("2026-07-04"),
      phase: "Accompagnement amont",
      groupe_instructeurs: instructeur.groupeId as GroupeInstructeursId,
      demandeur_personne_physique: { last_name: "Roux", first_names: "Sam" },
    },
    ADMIN_EMAIL,
    db,
  );

  const stored = await addPieceJointeFromAdmin(
    id,
    { name: "note.pdf", media_type: "application/pdf", content: Buffer.from("contenu pdf") },
    db,
  );
  const fichierId = stored.id as FileId;

  const detail = await getDossierDetailForAdmin(id, db);
  expect(detail.piecesJointes.map((pieceJointe) => pieceJointe.name)).toContain("note.pdf");

  await deletePieceJointeFromAdmin(id, fichierId, db);
  expect(await db("file").where({ id: fichierId }).first()).toBeUndefined();

  const dnDossier = await createDossierRow(db, { demarche_numerique_number: "910102" });
  await expect(
    addPieceJointeFromAdmin(
      dnDossier.id as DossierId,
      { name: "refuse.pdf", media_type: "application/pdf", content: Buffer.from("x") },
      db,
    ),
  ).rejects.toBeInstanceOf(DossierManagedByDnError);
});
