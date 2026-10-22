import { afterEach, expect, test, vi } from "vitest";
import { seed as seedUsers } from "../../../../libs/database/seeds/dev/06_users.ts";
import { connectUser, getSessionUser } from "@pitchou/server/users.ts";
import { dossiersAccessibleToUser } from "@pitchou/server/database/dossier/access.ts";
import { db } from "../setup/db.ts";

afterEach(() => vi.unstubAllEnvs());

test("staging admins can access both apps without SEED_EMAIL and survive repeated seeds", async () => {
  vi.stubEnv("PUBLIC_PITCHOU_ENV", "staging");
  vi.stubEnv("SEED_EMAIL", undefined);
  vi.stubEnv(
    "PITCHOU_ADMIN_EMAILS",
    " BOOTSTRAP@example.org, second@example.org, bootstrap@example.org, ,",
  );
  const [existing] = await db("auth_user")
    .insert({ email: "bootstrap@example.org" })
    .returning("*");
  await db("auth_permission_bundle").insert({
    user_id: existing.id,
    bundle: "administrateur",
  });
  await seedUsers(db);
  const [dossier] = await db("dossier")
    .insert({ source: "pitchou", primary_department: "75", depot_date: new Date() })
    .returning("*");
  const emails = ["bootstrap@example.org", "second@example.org"];
  for (const email of emails) {
    const user = await connectUser(
      {
        issuer: "https://proconnect.test",
        subject: email,
        email,
        firstNames: "Team",
        lastName: "Member",
      },
      db,
    );
    if (email === existing.email) expect(user.id).toBe(existing.id);
    const session = await getSessionUser(user.id, db);
    expect(session?.permissions).toEqual(
      expect.arrayContaining(["admin:access", "users:manage", "dossier:read", "dossier:instruct"]),
    );
    expect(session?.groupes).toEqual([expect.objectContaining({ name: "Administrateur" })]);
    expect((await dossiersAccessibleToUser(dossier.id, user.id, db)).get(dossier.id)).toBe(
      "complet",
    );
    await db("edge_personne_follows_dossier").insert({ personne: user.id, dossier: dossier.id });
  }
  const users = await db("auth_user").whereIn("email", emails).orderBy("email");
  const userIds = users.map(({ id }) => id);
  const memberships = await db("user_groupe").whereIn("user_id", userIds).orderBy("user_id");
  await seedUsers(db);
  expect(await db("auth_user").whereIn("email", emails).orderBy("email")).toEqual(users);
  expect(await db("user_groupe").whereIn("user_id", userIds).orderBy("user_id")).toEqual(
    memberships,
  );
  expect(
    await db("auth_permission_bundle")
      .whereIn("user_id", userIds)
      .where({ bundle: "administrateur" }),
  ).toHaveLength(2);
  expect(await db("edge_personne_follows_dossier").whereIn("personne", userIds)).toHaveLength(2);
  expect(await db("auth_user").where({ email: "dev@localhost.local" })).toHaveLength(1);
});

test.each([undefined, "production"])(
  "seeds do not provision the staging admin list when PUBLIC_PITCHOU_ENV is %s",
  async (environment) => {
    vi.stubEnv("PUBLIC_PITCHOU_ENV", environment);
    vi.stubEnv("PITCHOU_ADMIN_EMAILS", "staging-only@example.org");
    await seedUsers(db);
    expect(await db("auth_user").where({ email: "staging-only@example.org" })).toHaveLength(0);
  },
);

test.each([undefined, " , , "])("staging seeds accept an empty admin list: %s", async (emails) => {
  vi.stubEnv("PUBLIC_PITCHOU_ENV", "staging");
  vi.stubEnv("PITCHOU_ADMIN_EMAILS", emails);
  vi.stubEnv("SEED_EMAIL", "demo@example.org");
  await seedUsers(db);
  const user = await db("auth_user").where({ email: "demo@example.org" }).first();
  expect((await getSessionUser(user.id, db))?.groupes).toEqual([
    expect.objectContaining({ name: "Administrateur" }),
  ]);
});
