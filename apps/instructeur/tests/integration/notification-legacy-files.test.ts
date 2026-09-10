import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import {
  createInstructeurWithDossier,
  createInstructeurWithCapToGroup,
  attachCapToGroupe,
} from "../factories/index.ts";
import { backfillLegacyReviews } from "../../../../libs/database/migrations/20260906120000_personal-notification-revisions.ts";
import { getNotificationsForPersonneFromCap } from "@pitchou/server/database/notification.ts";
import type { CapDossierCap } from "@pitchou/types/database/public/CapDossier.ts";

test("migration preserves proven later file/species revisions with personal read cutoffs", async () => {
  const owner = await createInstructeurWithDossier(db, { nomGroupe: "Fichiers après lecture" });
  const lateReader = await createInstructeurWithCapToGroup(db, { nomGroupe: "Lecture ultérieure" });
  await attachCapToGroupe(db, lateReader.cap, owner.groupeId);
  const sequence = await createInstructeurWithDossier(db, { nomGroupe: "Deux révisions espèces" });
  const firstAfterRead = await createInstructeurWithDossier(db, {
    nomGroupe: "Premier fichier après lecture",
  });
  const t0 = new Date("2026-08-01T12:00:00Z"),
    readAt = new Date("2026-08-02T12:00:00Z"),
    t2 = new Date("2026-08-03T12:00:00Z");
  await db("notification").insert([
    { dossier: owner.dossier.id, personne: owner.id, viewed: false, viewed_at: readAt },
    {
      dossier: owner.dossier.id,
      personne: lateReader.id,
      viewed: false,
      viewed_at: new Date("2026-08-04"),
    },
    { dossier: sequence.dossier.id, personne: sequence.id, viewed: false, viewed_at: null },
    {
      dossier: firstAfterRead.dossier.id,
      personne: firstAfterRead.id,
      viewed: false,
      viewed_at: readAt,
    },
  ]);
  await db("notification_arrival")
    .whereIn("dossier", [owner.dossier.id, sequence.dossier.id, firstAfterRead.dossier.id])
    .delete();
  const action = (dossier: number, type: string, created_at: Date, name?: string) => ({
    dossier,
    type,
    created_at,
    author_petitionnaire: true,
    data: JSON.stringify(name ? { name } : {}),
  });
  const inserted = await db("action_dossier")
    .insert([
      action(owner.dossier.id, "piece_jointe_importee", t0, "initial.pdf"),
      action(owner.dossier.id, "piece_jointe_importee", t0, "initial-2.pdf"),
      action(owner.dossier.id, "especes_renseignees", t0),
      action(owner.dossier.id, "piece_jointe_importee", t2, "apres.pdf"),
      action(owner.dossier.id, "especes_renseignees", t2),
      action(sequence.dossier.id, "especes_renseignees", t0),
      action(sequence.dossier.id, "especes_renseignees", t2),
      action(sequence.dossier.id, "piece_jointe_importee", t0, "baseline-a.pdf"),
      action(sequence.dossier.id, "piece_jointe_importee", t0, "baseline-b.pdf"),
      action(firstAfterRead.dossier.id, "piece_jointe_importee", t2, "ajout.pdf"),
    ])
    .returning("id");
  await backfillLegacyReviews(db);
  const [pending] = await getNotificationsForPersonneFromCap(owner.cap as CapDossierCap, db);
  expect(pending.viewed).toBe(false);
  expect(pending.changes.flatMap(({ revisions }) => revisions).sort()).toEqual(
    [inserted[3].id, inserted[4].id].sort(),
  );
  expect(pending.changes.find(({ field }) => field.startsWith("piece:"))).toMatchObject({
    field: `piece:historique:${inserted[3].id}`,
    label: "apres.pdf",
  });
  expect(
    (await getNotificationsForPersonneFromCap(lateReader.cap as CapDossierCap, db))[0],
  ).toMatchObject({ viewed: true, changes: [] });
  const [secondSpecies] = await getNotificationsForPersonneFromCap(
    sequence.cap as CapDossierCap,
    db,
  );
  expect(secondSpecies.changes).toMatchObject([{ field: "especes", revisions: [inserted[6].id] }]);
  const [firstFile] = await getNotificationsForPersonneFromCap(
    firstAfterRead.cap as CapDossierCap,
    db,
  );
  expect(firstFile.changes[0].revisions).toEqual([inserted[9].id]);
  expect(
    await db("action_dossier").whereIn(
      "id",
      inserted.map(({ id }) => id),
    ),
  ).toHaveLength(10);
});
