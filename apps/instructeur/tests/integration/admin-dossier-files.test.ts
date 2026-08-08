import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { getTestS3 } from "../setup/s3.ts";
import {
  createDossier as createDossierRow,
  createInstructeurWithCapToGroup,
} from "../factories/index.ts";
import { physicalAdminDossierRelations } from "../factories/adminDossier.ts";
import {
  createDossierFromAdmin,
  deleteDossierFromAdmin,
  DossierNotCreatedInPitchouError,
} from "@pitchou/server/database/dossier_admin.ts";
import {
  addPieceJointeFromAdmin,
  deletePieceJointeFromAdmin,
} from "@pitchou/server/database/dossier_admin_files.ts";
import { getDossierDetailForAdmin } from "@pitchou/server/database/dossier_admin_list.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { GroupeInstructeursId } from "@pitchou/types/database/public/GroupeInstructeurs.ts";

const ADMIN_EMAIL = "admin-dossiers@pitchou.test";

test("suppression admin : refusée sur un dossier DN, effective sur un dossier natif", async () => {
  const dnDossier = await createDossierRow(db, { demarche_numerique_number: "910101" });
  await expect(deleteDossierFromAdmin(dnDossier.id as DossierId, db)).rejects.toBeInstanceOf(
    DossierNotCreatedInPitchouError,
  );
  const instructeur = await createInstructeurWithCapToGroup(db);
  const { id } = await createDossierFromAdmin(
    {
      name: "Dossier à supprimer",
      depot_date: new Date("2026-07-03"),
      phase: "Accompagnement amont",
      relations: physicalAdminDossierRelations(
        instructeur.groupeId as GroupeInstructeursId,
        "Petit",
        "Lou",
      ),
    },
    ADMIN_EMAIL,
    db,
  );
  const row = await db("dossier").select("demandeur_personne_physique").where({ id }).first();
  if (!row?.demandeur_personne_physique) throw new Error("Missing test demandeur");
  await deleteDossierFromAdmin(id, db);
  expect(await db("dossier").where({ id }).first()).toBeUndefined();
  expect(await db("evenement_phase_dossier").where({ dossier: id })).toHaveLength(0);
  expect(
    await db("personne").where({ id: row.demandeur_personne_physique }).first(),
  ).toBeUndefined();
});

test("pièces jointes admin : ajout/suppression sur dossier natif, refus sur dossier DN", async () => {
  await getTestS3();
  const instructeur = await createInstructeurWithCapToGroup(db);
  const { id } = await createDossierFromAdmin(
    {
      name: "Dossier avec pièces jointes",
      depot_date: new Date("2026-07-04"),
      phase: "Accompagnement amont",
      relations: physicalAdminDossierRelations(
        instructeur.groupeId as GroupeInstructeursId,
        "Roux",
        "Sam",
      ),
    },
    ADMIN_EMAIL,
    db,
  );
  const stored = await addPieceJointeFromAdmin(
    id,
    { name: "note.pdf", media_type: "application/pdf", content: Buffer.from("contenu pdf") },
    db,
  );
  expect(
    (await getDossierDetailForAdmin(id, db)).piecesJointes.map((piece) => piece.name),
  ).toContain("note.pdf");
  await deletePieceJointeFromAdmin(id, stored.id as FileId, db);
  expect(await db("file").where({ id: stored.id }).first()).toBeUndefined();
  const dnDossier = await createDossierRow(db, { demarche_numerique_number: "910102" });
  await expect(
    addPieceJointeFromAdmin(
      dnDossier.id as DossierId,
      { name: "refuse.pdf", media_type: "application/pdf", content: Buffer.from("x") },
      db,
    ),
  ).rejects.toBeInstanceOf(DossierNotCreatedInPitchouError);
});
