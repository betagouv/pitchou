import { connectUser } from "@pitchou/server/users.ts";
import { createSession } from "@pitchou/server/session.ts";
import { db } from "../setup/db.ts";
import { ADMIN_BASE_URL } from "../setup/integration-global.ts";
import { fetchAuthenticated } from "./auth.ts";
export async function admin() {
  const account = await connectUser(
    {
      issuer: "https://proconnect.test",
      subject: "admin",
      email: "admin@test.fr",
      firstNames: "Admin",
      lastName: "Test",
    },
    db,
  );
  await db("auth_permission_bundle").insert({ user_id: account.id, bundle: "administrateur" });
  const token = await createSession(
    { userId: account.id, email: account.email!, name: "Admin", idToken: null },
    db,
  );
  return { ...account, token };
}

export async function saveGroup(token: string, input: object) {
  return fetchAuthenticated(token, `${ADMIN_BASE_URL}/api/groupes-instructeurs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}
