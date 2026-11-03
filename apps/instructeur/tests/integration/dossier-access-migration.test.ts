import { dossiersAccessibleToUser } from "@pitchou/server/database/dossier/access.ts";
import { changeAssignments } from "@pitchou/server/dossierRouting.ts";
import { expect, test } from "vitest";
import { up } from "../../../../libs/database/migrations/20261101120000_dossier-access-levels.ts";
import { createGroupeInstructeurs } from "../factories/dossier.ts";
import { disposableAccessDatabase } from "../helpers/disposableAccessDatabase.ts";

test("access upgrade preserves legacy grants, follows, reviews and email audit records without backlog", async () => {
  const fixture = await disposableAccessDatabase("20261101120000");
  const { db } = fixture;
  try {
    const group = await createGroupeInstructeurs(db);
    const [user] = await db("auth_user").insert({ email: "legacy@example.org" }).returning("id");
    await db("auth_permission_bundle").insert({ user_id: user.id, bundle: "instructeur" });
    await db("user_groupe").insert({ user_id: user.id, groupe_instructeurs: group.id });
    const [rule] = await db("group_routing_rule")
      .insert({ groupe_instructeurs: group.id, departments: ["75"] })
      .returning("id");
    await db("groupe_departement").insert({ groupe_instructeurs: group.id, department: "75" });
    const [dossier] = await db("dossier")
      .insert({
        name: "Legacy dossier",
        source: "pitchou",
        depot_date: new Date(),
        primary_department: "75",
      })
      .returning("id");
    await db("dossier_group_override").insert({
      dossier: dossier.id,
      groupe_instructeurs: group.id,
      mode: "include",
    });
    await db("edge_personne_follows_dossier").insert({ dossier: dossier.id, personne: user.id });
    const [action] = await db("action_dossier")
      .insert({ dossier: dossier.id, type: "commentaire_ajoute", data: {} })
      .returning("id");
    await db("notification_review").insert({ action: action.id, personne: user.id });
    const preserved = [
      "edge_personne_follows_dossier",
      "notification",
      "notification_review",
      "email_notification_outbox",
      "email_notification_history",
      "email_notification_groupe_arrival",
    ];
    const snapshots = await Promise.all(preserved.map((table) => db(table).select("*")));
    await db.transaction(up);
    for (const [index, table] of preserved.entries())
      expect(await db(table)).toEqual(snapshots[index]);
    expect(await db("dossier_user_access")).toEqual([]);
    expect(await db("group_routing_rule").where({ id: rule.id }).first()).toMatchObject({
      access_level: "instruct",
    });
    expect(await db("dossier_group_override").first()).toMatchObject({ access_level: "instruct" });
    expect(await db("edge_groupe_instructeurs__dossier").first()).toMatchObject({
      access_level: "instruct",
    });
    expect((await dossiersAccessibleToUser(dossier.id, user.id, db)).get(dossier.id)).toBe(
      "complet",
    );
    await changeAssignments(db, (trx) =>
      trx("dossier_group_override").where({ dossier: dossier.id }).update({ access_level: "read" }),
    );
    expect((await dossiersAccessibleToUser(dossier.id, user.id, db)).get(dossier.id)).toBe(
      "lecture_complete",
    );
    expect(await db("edge_personne_follows_dossier")).toEqual(snapshots[0]);
  } finally {
    await fixture.close();
  }
}, 60_000);
