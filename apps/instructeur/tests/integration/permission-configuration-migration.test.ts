import { expect, test } from "vitest";
import {
  up,
  down,
} from "../../../../libs/database/migrations/20261023105000_remember-permission-configuration.ts";
import { db } from "../setup/db.ts";

test("migration distinguishes configured and revoked accounts from accounts awaiting their first grant", async () => {
  await db.transaction(async (trx) => {
    await down(trx);
    const users = await trx("auth_user")
      .insert([
        { email: "granted@example.org" },
        { email: "revoked@example.org" },
        { email: "member@example.org" },
        { email: "unconfigured@example.org" },
      ])
      .returning("id");
    await trx("auth_permission_bundle").insert({ user_id: users[0].id, bundle: "instructeur" });
    await trx("administration_event").insert({
      action: "user_saved",
      data: JSON.stringify({ id: users[1].id }),
    });
    const [group] = await trx("groupe_instructeurs")
      .insert({ name: "Existing group" })
      .returning("id");
    await trx("user_groupe").insert({ user_id: users[2].id, groupe_instructeurs: group.id });
    await up(trx);
    expect(await trx("auth_user").orderBy("id").pluck("permissions_configured")).toEqual([
      true,
      true,
      true,
      false,
    ]);
    await trx("auth_permission_bundle").where({ user_id: users[0].id }).delete();
    expect((await trx("auth_user").where({ id: users[0].id }).first()).permissions_configured).toBe(
      true,
    );
  });
});
