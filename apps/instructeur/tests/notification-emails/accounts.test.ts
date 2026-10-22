import { expect, test, vi } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import {
  notificationFilters,
  notificationOverview,
} from "@pitchou/server/database/notification_monitoring.ts";
import { setup, dispatch } from "./fixtures.ts";

test("monitoring and audit use local accounts without an applicant record", async () => {
  const { actor } = await setup();
  await db("auth_user").insert({
    id: 900001,
    email: "local-account@test.fr",
    first_names: "Local",
  });
  await db("auth_permission_bundle").insert({ user_id: 900001, bundle: "instructeur" });
  await db("user_groupe").insert({ user_id: 900001, groupe_instructeurs: actor.groupeId });
  await db("edge_personne_follows_dossier").insert({ personne: 900001, dossier: actor.dossier.id });
  expect(await db("personne").where({ id: 900001 }).first()).toBeUndefined();
  const [row] = await db("email_notification_outbox")
    .insert({
      personne: 900001,
      dossier: actor.dossier.id,
      kind: "novelty",
      batch_key: "local-account",
      due_at: new Date(),
    })
    .returning("*");
  const overview = await notificationOverview(
    notificationFilters(new URLSearchParams({ search: "local-account@test.fr" })),
    db,
  );
  expect(overview.total).toBe(1);
  expect(overview.rows[0]).toMatchObject({
    personne: 900001,
    email: "local-account@test.fr",
    first_names: "Local",
  });
  const send = vi.fn().mockResolvedValue({ messageId: "local-test" });
  await dispatch(row.due_at, send);
  expect(send).toHaveBeenCalledOnce();
  expect(await db("evenement_metrique").where({ personne: 900001 }).pluck("evenement")).toEqual([
    "notificationEmailQueued",
    "notificationEmailSent",
  ]);
});
