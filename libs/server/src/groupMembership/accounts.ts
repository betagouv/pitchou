import type { Knex } from "knex";
import { GroupMembershipError } from "./access.ts";

export async function accountForMembership(email: string, trx: Knex.Transaction) {
  let user = await trx("auth_user").whereRaw("lower(email) = ?", [email]).first();
  if (user && !user.active)
    throw new GroupMembershipError(409, "Ce compte est désactivé. Contactez un administrateur.");
  if (!user) [user] = await trx("auth_user").insert({ email }).returning("*");
  const configured = await Promise.all(
    ["auth_permission_bundle", "auth_permission", "auth_permission_exclusion"].map((table) =>
      trx(table).where({ user_id: user.id }).first(),
    ),
  );
  // Only bootstrap unconfigured accounts. Explicit administrator choices stay intact.
  if (!user.permissions_configured && configured.every((assignment) => !assignment))
    await trx("auth_permission_bundle").insert({ user_id: user.id, bundle: "instructeur" });
  return user;
}
