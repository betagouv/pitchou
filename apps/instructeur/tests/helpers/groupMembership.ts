import type { Knex } from "knex";

export async function allowGroupManagement(db: Knex, userId: number) {
  await db("auth_permission").insert(
    ["admin:access", "groups:manage"].map((permission) => ({ user_id: userId, permission })),
  );
}
