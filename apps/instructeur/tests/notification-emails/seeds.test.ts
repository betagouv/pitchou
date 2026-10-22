import { expect, test } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { seed as seedUsers } from "../../../../libs/database/seeds/dev/06_users.ts";
import { seedDossierActors } from "../../../../libs/database/seeds/dev/dossier/actors.ts";
import { seedDossierRows } from "../../../../libs/database/seeds/dev/dossier/rows.ts";
import { baselineSeedNotifications } from "../../../../libs/database/seeds/dev/dossier/notifications.ts";
import { SEED_DOSSIERS } from "../../../../libs/database/seeds/fixtures/dossiers.ts";

// Exercise the real seed writers without S3 uploads or delivery.
test("fresh and repeated dossier seeds record final group baselines without queuing demo emails", async () => {
  await seedUsers(db);
  const seedRows = () =>
    db.transaction(async (trx) => {
      const actors = await seedDossierActors(trx, process.env.SEED_EMAIL ?? "dev@localhost.local");
      const rows = await seedDossierRows(trx, actors);
      await baselineSeedNotifications(trx, Object.values(rows.dossierIdMap));
      return rows;
    });
  const first = await seedRows();
  const ownerships = await db("edge_groupe_instructeurs__dossier")
    .select("dossier", "groupe_instructeurs")
    .orderBy("dossier");
  expect(ownerships.length).toBeGreaterThan(0);
  expect(
    await db("email_notification_groupe_arrival")
      .select("dossier", "groupe_instructeurs")
      .whereNotNull("groupe_instructeurs")
      .orderBy("dossier"),
  ).toEqual(ownerships);
  expect(await db("email_notification_outbox")).toEqual([]);
  expect(await db("email_notification_history")).toEqual([]);
  // Repair an old seed baseline when the seed writer restores its fixture group.
  const [ownership] = ownerships;
  await db("email_notification_groupe_arrival").where(ownership).delete();
  const second = await seedRows();
  expect(second.dossierIdMap).toEqual(first.dossierIdMap);
  expect(await db("email_notification_groupe_arrival").where(ownership).first()).toBeDefined();
  expect(await db("email_notification_outbox")).toEqual([]);
  expect(await db("email_notification_history")).toEqual([]);
  expect((await db("dossier").count("* as count").first())?.count).toBe(
    String(SEED_DOSSIERS.length),
  );
});
