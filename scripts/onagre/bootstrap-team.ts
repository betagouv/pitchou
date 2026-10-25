import { directDatabaseConnection as db } from "@pitchou/server/database.ts";

const role = process.env.ONAGRE_DEPLOYMENT_ROLE;
if (!["workspace", "rehearsal"].includes(role ?? ""))
  throw new Error("Set ONAGRE_DEPLOYMENT_ROLE to workspace or rehearsal.");
const emails = [
  ...new Set(
    (process.env.PITCHOU_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  ),
];
if (emails.length === 0 || emails.some((email) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(email)))
  throw new Error("PITCHOU_ADMIN_EMAILS must list the team members allowed in this deployment.");
const apply = process.argv.slice(2).includes("--apply");
try {
  await db.transaction(async (trx) => {
    const { database } = (await trx.raw("select current_database() as database")).rows[0];
    if (database !== process.env.ONAGRE_EXPECTED_DATABASE)
      throw new Error("ONAGRE_EXPECTED_DATABASE must match the isolated target database name.");
    console.log(`${role}: ${emails.length} team accounts in ${database}.`);
    console.log("Other accounts will be disabled. Existing sessions will be revoked.");
    if (!apply) return;
    await trx("auth_user").whereNotIn(trx.raw("lower(email)"), emails).update({ active: false });
    for (const email of emails) {
      let user = await trx("auth_user").whereRaw("lower(email) = ?", [email]).first("id");
      if (user)
        await trx("auth_user")
          .where({ id: user.id })
          .update({ active: true, permissions_configured: true });
      else
        [user] = await trx("auth_user")
          .insert({ email, active: true, permissions_configured: true })
          .returning("id");
      await trx("auth_permission_bundle")
        .insert({ user_id: user.id, bundle: "administrateur" })
        .onConflict(["user_id", "bundle"])
        .ignore();
    }
    await trx("session").delete();
  });
  console.log(apply ? "Team access configured." : "Preview only. Append --apply to save.");
} finally {
  await db.destroy();
}
