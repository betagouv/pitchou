import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { getDossierReviewSnapshot } from "@pitchou/server/database/notification/snapshot.ts";
import type { CapDossierCap } from "@pitchou/types/database/public/CapDossier.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

test("dossier values and review revisions become visible together at synchronization commit", async () => {
  const owner = await createInstructeurWithDossier(db, { nomGroupe: "Snapshot notifications" });
  const id = owner.dossier.id as DossierId;
  const cap = owner.cap as CapDossierCap;
  await db("dossier").where("id", id).update({ description: "Ancien texte" });
  const sync = await db.transaction();
  try {
    const [action] = await sync("action_dossier")
      .insert({
        dossier: id,
        type: "champ_modifie",
        author_petitionnaire: true,
        data: JSON.stringify({ field: "Description", column: "description", notification: true }),
      })
      .returning("id");
    // Even after the action insert, an uncommitted synchronization cannot expose
    // its revision alongside the old value to the dossier reader.
    const before = await getDossierReviewSnapshot(id, cap, false, db);
    expect(before?.description).toBe("Ancien texte");
    expect(before?.notificationSnapshot?.changes).toEqual([]);
    await sync("dossier").where("id", id).update({ description: "Nouveau texte" });
    await sync.commit();
    const after = await getDossierReviewSnapshot(id, cap, false, db);
    expect(after?.description).toBe("Nouveau texte");
    expect(after?.notificationSnapshot?.changes[0].revisions).toEqual([action.id]);
  } finally {
    if (!sync.isCompleted()) await sync.rollback();
  }
});
