import type { Knex } from "knex";
import { connectUser, getSessionUser } from "@pitchou/server/users.ts";
import { createSession } from "@pitchou/server/session.ts";
import type { verifyHandoff } from "./tokens.ts";

type Handoff = Awaited<ReturnType<typeof verifyHandoff>>;

export async function acceptHandoff(db: Knex, handoff: Handoff) {
  return db.transaction(async (trx) => {
    if (handoff.expiresAt.getTime() <= Date.now()) throw new Error("Login handoff expired.");
    await trx("auth_login_handoff").where("expires_at", "<", trx.fn.now()).delete();
    const claimed = await trx("auth_login_handoff")
      .insert({ id: handoff.id, expires_at: handoff.expiresAt })
      .onConflict("id")
      .ignore()
      .returning("id");
    if (claimed.length === 0) throw new Error("Login handoff already used.");
    // Only existing permitted accounts may log in. The bridge never provisions team access.
    const binding = await trx("auth_identity")
      .where({ issuer: handoff.identity.issuer, subject: handoff.identity.subject })
      .first();
    const account = binding
      ? await trx("auth_user").where({ id: binding.user_id }).first()
      : await trx("auth_user")
          .where({ email: handoff.identity.email.trim().toLowerCase() })
          .first();
    if (!account || !(await getSessionUser(account.id, trx))?.permissions.includes("admin:access"))
      return null;
    const user = await connectUser(handoff.identity, trx);
    if (!(await getSessionUser(user.id, trx))?.permissions.includes("admin:access")) return null;
    return createSession(
      {
        userId: user.id,
        email: handoff.identity.email,
        name: [handoff.identity.firstNames, handoff.identity.lastName].filter(Boolean).join(" "),
        idToken: null,
      },
      trx,
    );
  });
}
