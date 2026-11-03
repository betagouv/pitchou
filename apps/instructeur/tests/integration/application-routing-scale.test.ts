import { changeAssignments } from "@pitchou/server/dossierRouting.ts";
import { expect, test } from "vitest";
import { db } from "../setup/db.ts";

test.skipIf(process.env.PITCHOU_RUN_PREVIEW_SCALE !== "1")(
  "recalculates 20k assignments and downgrades without replacing arrival baselines",
  async () => {
    const [group] = await db("groupe_instructeurs").insert({ name: "Scale" }).returning("id");
    const [user] = await db("auth_user").insert({ email: "scale@example.org" }).returning("id");
    await db("auth_permission_bundle").insert({ user_id: user.id, bundle: "instructeur" });
    await db("user_groupe").insert({ user_id: user.id, groupe_instructeurs: group.id });
    const start = performance.now();
    await changeAssignments(
      db,
      async (trx) => {
        await trx.raw(`INSERT INTO dossier(name, primary_department, source)
        SELECT 'Synthetic ' || n, '75', 'pitchou' FROM generate_series(1, 20000) n`);
        await trx("groupe_regle").insert({
          groupe_instructeurs: group.id,
          departments: ["75"],
          access_level: "instruct",
        });
      },
      { silent: true },
    );
    const initialMs = performance.now() - start;
    expect(await db("edge_groupe_instructeurs__dossier").count("* as n").first()).toEqual({
      n: "20000",
    });
    expect(await db("email_notification_outbox")).toEqual([]);
    const first = await db("dossier").orderBy("id").first("id");
    const baseline = await db("email_notification_groupe_arrival")
      .where({ dossier: first.id })
      .first();
    await db("edge_personne_follows_dossier").insert({ dossier: first.id, personne: user.id });
    const downgradeStart = performance.now();
    await changeAssignments(
      db,
      (trx) =>
        trx("groupe_regle")
          .where({ groupe_instructeurs: group.id })
          .update({ access_level: "read" }),
      { silent: true },
    );
    expect(
      await db("edge_groupe_instructeurs__dossier")
        .where({ access_level: "read" })
        .count("* as n")
        .first(),
    ).toEqual({ n: "20000" });
    expect(
      await db("email_notification_groupe_arrival").where({ dossier: first.id }).first(),
    ).toEqual(baseline);
    expect(await db("edge_personne_follows_dossier")).toHaveLength(1);
    expect(await db("email_notification_outbox")).toEqual([]);
    console.info(
      "Application routing 20k measurements",
      JSON.stringify({ initialMs, downgradeMs: performance.now() - downgradeStart }),
    );
  },
  120_000,
);
