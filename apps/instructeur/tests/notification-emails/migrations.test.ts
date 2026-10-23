import {
  up as upArrival,
  down as downArrival,
} from "../../../../libs/database/migrations/20261021120000_group-arrival-emails.ts";
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
import {
  up as upProtection,
  down as downProtection,
} from "../../../../libs/database/migrations/20261022160000_staging-email-protection.ts";
import { setup } from "./fixtures.ts";
import { setupArrival } from "./arrivalFixtures.ts";
import {
  up as upAudit,
  down as downAudit,
} from "../../../../libs/database/migrations/20261022140000_notification-observability.ts";

test("migrations roll back and reapply, initialize existing accounts, and never backfill old events", async () => {
  await downProtection(db);
  await downAudit(db);
  await downArrival(db);
  await downOutbox(db);
  await downPreferences(db);
  const { actor, action } = await setup();
  await action("avis_modifie");
  await upPreferences(db);
  await upOutbox(db);
  await upArrival(db);
  await upAudit(db);
  await upProtection(db);
  expect(await db("email_notification_outbox")).toHaveLength(0);
  expect(
    await db("email_notification_preferences").where({ personne: actor.id }).first(),
  ).toMatchObject({ assignment: true, novelty: true, arrival: true });
  await action("avis_modifie");
  expect(await db("email_notification_outbox")).toHaveLength(1);
});

test("arrival migration preserves disabled preferences and baselines existing groups", async () => {
  await downProtection(db);
  await downAudit(db);
  await downArrival(db);
  const { arrive, member, dossier } = await setupArrival();
  await arrive();
  await db("email_notification_preferences")
    .where({ personne: member.id })
    .update({ assignment: false, novelty: false });
  await upArrival(db);
  await upAudit(db);
  await upProtection(db);
  expect(
    await db("email_notification_preferences").where({ personne: member.id }).first(),
  ).toMatchObject({ assignment: false, novelty: false, arrival: true });
  await db("edge_groupe_instructeurs__dossier")
    .where({ dossier: dossier.id })
    .update({ groupe_instructeurs: member.groupeId });
  expect(await db("email_notification_outbox")).toHaveLength(0);
});

test("a schema downgrade preserves sent outbox IDs and bodies but makes suppressed rows terminal", async () => {
  const { recipient, actor } = await setup();
  const [sent, suppressed] = await db("email_notification_outbox")
    .insert([
      {
        personne: recipient.id,
        dossier: actor.dossier.id,
        kind: "assignment",
        batch_key: "rollback-sent",
        due_at: new Date(),
        status: "sent",
        message: JSON.stringify({ htmlContent: "frozen body" }),
      },
      {
        personne: recipient.id,
        dossier: actor.dossier.id,
        kind: "assignment",
        batch_key: "rollback-suppressed",
        due_at: new Date(),
        status: "suppressed",
        cancellation_reason: "staging_allowlist",
      },
    ])
    .returning("*");
  await downProtection(db);
  expect(await db("email_notification_outbox").where({ id: suppressed.id }).first()).toMatchObject({
    status: "cancelled",
  });
  await downAudit(db);
  expect(await db("email_notification_outbox").where({ id: sent.id }).first()).toMatchObject({
    status: "sent",
    message: { htmlContent: "frozen body" },
  });
  await upAudit(db);
  await upProtection(db);
  expect(await db("email_notification_outbox").where({ id: sent.id }).first()).toMatchObject({
    status: "sent",
  });
  expect(await db("email_notification_outbox").where({ id: suppressed.id }).first()).toMatchObject({
    status: "cancelled",
  });
});
