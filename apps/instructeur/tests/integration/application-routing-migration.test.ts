import { logActionsDossier } from "@pitchou/server/database/action_dossier.ts";
import { changeAssignments, recalculateAssignments } from "@pitchou/server/dossierRouting.ts";
import { expect, test } from "vitest";
import { up } from "../../../../libs/database/migrations/20261101120000_dossier-access-levels.ts";
import { disposableAccessDatabase } from "../helpers/disposableAccessDatabase.ts";

test("moving routing into the app preserves assignments, follows and pending email history", async () => {
  const fixture = await disposableAccessDatabase("20261101120000");
  const { db } = fixture;
  try {
    const [group] = await db("groupe_instructeurs")
      .insert({ name: "Migration", active: true })
      .returning("id");
    const [user] = await db("auth_user").insert({ email: "migration@example.org" }).returning("id");
    await db("auth_permission_bundle").insert({ user_id: user.id, bundle: "instructeur" });
    await db("user_groupe").insert({ user_id: user.id, groupe_instructeurs: group.id });
    await db("groupe_departement").insert({ groupe_instructeurs: group.id, department: "75" });
    const [dossier] = await db("dossier")
      .insert({
        name: "Preserved",
        source: "pitchou",
        depot_date: new Date(),
        primary_department: "75",
      })
      .returning("id");
    await db("edge_personne_follows_dossier").insert({ personne: user.id, dossier: dossier.id });
    const tables = [
      "edge_groupe_instructeurs__dossier",
      "edge_personne_follows_dossier",
      "email_notification_groupe_arrival",
      "email_notification_outbox",
      "email_notification_history",
    ];
    const before = await Promise.all(tables.map((table) => db(table).select("*")));
    await db.transaction(up);
    before[0] = before[0].map((edge) => ({ ...edge, access_level: "instruct" }));
    expect(before[3].length).toBeGreaterThan(0);
    expect(before[4].length).toBeGreaterThan(0);
    for (const [i, table] of tables.entries()) expect(await db(table)).toEqual(before[i]);
    const { rows } =
      await db.raw(`SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace
      AND (proname LIKE 'route_pitchou_%' OR proname IN ('pitchou_dossier_access',
        'pitchou_rule_matches', 'recalculate_pitchou_ownership', 'queue_pitchou_email_notification',
        'queue_pitchou_groupe_arrival_email', 'pitchou_notification_cancellation'))`);
    expect(rows).toEqual([]);
    // Raw data changes deliberately have no business side effects after this migration.
    await db("dossier").where({ id: dossier.id }).update({ primary_department: "33" });
    expect(await db(tables[0])).toEqual(before[0]);
    await db.transaction((trx) => recalculateAssignments(trx, { dossiers: [dossier.id] }));
    expect(await db(tables[0])).toEqual([]);
    expect(await db("email_notification_outbox").where({ status: "pending" })).toEqual([]);
  } finally {
    await fixture.close();
  }
}, 60_000);

test("assignment and email history failures roll back the complete application operation", async () => {
  const fixture = await disposableAccessDatabase();
  const { db } = fixture;
  try {
    const [group] = await db("groupe_instructeurs")
      .insert({ name: "Atomic", active: true })
      .returning("id");
    const [user] = await db("auth_user").insert({ email: "atomic@example.org" }).returning("id");
    await db("auth_permission_bundle").insert({ user_id: user.id, bundle: "instructeur" });
    await db("user_groupe").insert({ user_id: user.id, groupe_instructeurs: group.id });
    await db("groupe_departement").insert({ groupe_instructeurs: group.id, department: "75" });
    await db.raw(`ALTER TABLE email_notification_history ADD CONSTRAINT reject_queue_test
      CHECK (event <> 'queued') NOT VALID`);
    await expect(
      changeAssignments(db, (trx) =>
        trx("dossier").insert({
          name: "Must roll back",
          source: "pitchou",
          depot_date: new Date(),
          primary_department: "75",
        }),
      ),
    ).rejects.toThrow("reject_queue_test");
    expect(await db("dossier")).toEqual([]);
    expect(await db("edge_groupe_instructeurs__dossier")).toEqual([]);
    expect(await db("email_notification_groupe_arrival")).toEqual([]);
    expect(await db("email_notification_outbox")).toEqual([]);
    await db.raw("ALTER TABLE email_notification_history DROP CONSTRAINT reject_queue_test");
    const [dossier] = await changeAssignments(db, (trx) =>
      trx("dossier")
        .insert({
          name: "Committed",
          source: "pitchou",
          depot_date: new Date(),
          primary_department: "75",
        })
        .returning("id"),
    );
    await db("edge_personne_follows_dossier").insert({ personne: user.id, dossier: dossier.id });
    await db.raw(`ALTER TABLE email_notification_history ADD CONSTRAINT reject_queue_test
      CHECK (event <> 'queued') NOT VALID`);
    await expect(
      logActionsDossier(
        [
          {
            dossier: dossier.id,
            type: "champ_modifie",
            author_petitionnaire: true,
            data: { notification: true },
          },
        ],
        db,
      ),
    ).rejects.toThrow("reject_queue_test");
    expect(await db("action_dossier")).toEqual([]);
    expect(await db("email_notification_outbox").where({ kind: "novelty" })).toEqual([]);
  } finally {
    await fixture.close();
  }
}, 60_000);
