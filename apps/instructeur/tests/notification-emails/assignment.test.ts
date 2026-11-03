import { expect, test } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { logActionsDossier } from "@pitchou/server/database/action_dossier.ts";
import { updateDossierFollowers } from "@pitchou/server/database/relation_suivi.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { ActionDossierInitializer } from "@pitchou/types/database/public/ActionDossier.ts";
import { setup, dispatch } from "./fixtures.ts";

test("assigning a group colleague queues one assignment email without notifying the actor", async () => {
  const { actor, recipient } = await setup();
  await db("edge_personne_follows_dossier").where({ personne: recipient.id }).delete();
  const assign = (added: string[]) =>
    db.transaction(async (trx) => {
      const updated = await updateDossierFollowers(
        actor.id as UserId,
        actor.dossier.id as ActionDossierInitializer["dossier"],
        [actor.email, recipient.email],
        trx,
      );
      expect(updated).toEqual({ added, removed: [] });
      if (!updated) throw new Error("Expected an authorized group assignment");
      await logActionsDossier(
        updated.added.map((follower) => ({
          dossier: actor.dossier.id as ActionDossierInitializer["dossier"],
          type: "dossier_suivi",
          author_personne: actor.id as ActionDossierInitializer["author_personne"],
          data: { follower },
        })),
        trx,
      );
    });
  await assign([recipient.email]);
  await assign([]);
  expect(await db("edge_personne_follows_dossier").where({ personne: recipient.id })).toHaveLength(
    1,
  );
  expect(await db("email_notification_outbox")).toMatchObject([
    { personne: recipient.id, kind: "assignment" },
  ]);
  const sent = await dispatch(new Date());
  expect(sent.send).toHaveBeenCalledOnce();
  expect(sent.send).toHaveBeenCalledWith(
    expect.objectContaining({
      to: [recipient.email],
      subject: expect.stringContaining("Suivi dossier:"),
    }),
  );
});
