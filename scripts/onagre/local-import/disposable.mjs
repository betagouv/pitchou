import { disposableAccessDatabase } from "../../../apps/instructeur/tests/helpers/disposableAccessDatabase.ts";

// Verification only. The public importer still accepts only the declared local development target.
export async function disposableClient() {
  const fixture = await disposableAccessDatabase();
  let trx;
  return {
    get trx() {
      return trx;
    },
    async begin() {
      trx = await fixture.db.transaction();
    },
    async query(sql, values) {
      return (await trx.client.acquireConnection()).query(sql, values);
    },
    async end() {
      try {
        if (trx && !trx.isCompleted()) await trx.rollback();
      } finally {
        await fixture.close();
      }
    },
  };
}

export async function seedReviewer(client, email) {
  const [reviewer] = await client.trx("auth_user").insert({ email, active: true }).returning("id");
  await client.trx("auth_permission").insert(
    ["dossier:read", "dossier:instruct"].map((permission) => ({
      user_id: reviewer.id,
      permission,
    })),
  );
}
