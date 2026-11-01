import { expect, test } from "vitest";
import { createDossier, createGroupeInstructeurs } from "../factories/dossier.ts";
import { disposableAccessDatabase } from "../helpers/disposableAccessDatabase.ts";
import { up } from "../../../../libs/database/migrations/20261101120000_dossier-access-levels.ts";

test("access upgrade preserves legacy grants, follows, reviews and email audit records without backlog", async () => {
  const fixture = await disposableAccessDatabase("20261101120000");
  const { db } = fixture;
  try {
    const group = await createGroupeInstructeurs(db);
    const [user] = await db("auth_user").insert({ email: "legacy@example.org" }).returning("id");
    await db("auth_permission_bundle").insert({ user_id: user.id, bundle: "instructeur" });
    await db("user_groupe").insert({ user_id: user.id, groupe_instructeurs: group.id });
    const [rule] = await db("groupe_regle")
      .insert({ groupe_instructeurs: group.id, departments: ["75"] })
      .returning("id");
    const dossier = await createDossier(db, { primary_department: "75" });
    await db("groupe_dossier_override").insert({
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
    expect(await db("groupe_regle").where({ id: rule.id }).first()).toMatchObject({
      access_level: "instruct",
    });
    expect(await db("groupe_dossier_override").first()).toMatchObject({ access_level: "instruct" });
    expect(await db("edge_groupe_instructeurs__dossier").first()).toMatchObject({
      access_level: "instruct",
    });
    expect(
      (await db.raw("SELECT pitchou_dossier_access(?, ?) AS access", [dossier.id, user.id])).rows,
    ).toEqual([{ access: "complet" }]);
    await db("groupe_dossier_override")
      .where({ dossier: dossier.id })
      .update({ access_level: "read" });
    expect(
      (await db.raw("SELECT pitchou_dossier_access(?, ?) AS access", [dossier.id, user.id])).rows,
    ).toEqual([{ access: "lecture_complete" }]);
    expect(await db("edge_personne_follows_dossier")).toEqual(snapshots[0]);
  } finally {
    await fixture.close();
  }
}, 60_000);
