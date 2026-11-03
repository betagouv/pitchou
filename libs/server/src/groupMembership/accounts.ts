import type { Knex } from "knex";
import { GroupMembershipError } from "./access.ts";

export async function accountForMembership(email: string, trx: Knex.Transaction) {
  let user = await trx("auth_user").whereRaw("lower(email) = ?", [email]).first();
  if (user && !user.active)
    throw new GroupMembershipError(409, "Ce compte est désactivé. Contactez un administrateur.");
  if (!user) [user] = await trx("auth_user").insert({ email }).returning("*");
  const bundle = await trx("auth_permission_bundle").where({ user_id: user.id }).first();
  const grant = await trx("auth_permission").where({ user_id: user.id }).first();
  const exclusion = await trx("auth_permission_exclusion").where({ user_id: user.id }).first();
  const configured = [bundle, grant, exclusion];
  // Only bootstrap unconfigured accounts. Explicit administrator choices stay intact.
  if (!user.permissions_configured && configured.every((assignment) => !assignment))
    await trx("auth_permission_bundle").insert({ user_id: user.id, bundle: "instructeur" });
  return user;
}
