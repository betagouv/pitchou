import { expect, test } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import {
  up as upOutbox,
  down as downOutbox,
} from "../../../../libs/database/migrations/20261014121000_email-notification-outbox.ts";
import {
  up as upPreferences,
  down as downPreferences,
} from "../../../../libs/database/migrations/20261014120000_email-notification-preferences.ts";
import { setup } from "./fixtures.ts";

test("migrations roll back and reapply, initialize existing accounts, and never backfill old events", async () => {
  await downOutbox(db);
  await downPreferences(db);
  const { actor, action } = await setup();
  await action("avis_modifie");
  await upPreferences(db);
  await upOutbox(db);
  expect(await db("email_notification_outbox")).toHaveLength(0);
  expect(
    await db("email_notification_preferences").where({ personne: actor.id }).first(),
  ).toMatchObject({ assignment: true, novelty: true });
  await action("avis_modifie");
  expect(await db("email_notification_outbox")).toHaveLength(1);
});
