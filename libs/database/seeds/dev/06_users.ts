import type { Knex } from "knex";
import { SEED_DEMARCHE_NUMBER } from "../fixtures/demarche_numerique.ts";
import { SEED_GROUPES } from "../fixtures/groupes.ts";
import { SEED_PERSONNES } from "../fixtures/users.ts";

const SEED_EMAIL = process.env.SEED_EMAIL || "dev@localhost.local";

export async function seed(db: Knex) {
  await db.transaction(async (trx) => {
    for (const { departments, ...group } of SEED_GROUPES) {
      const [created] = await trx("groupe_instructeurs")
        .insert({ ...group, demarche_number: SEED_DEMARCHE_NUMBER })
        .onConflict(["name", "demarche_number"])
        .ignore()
        .returning("id");
      // A rerun preserves coverage subsequently configured through the admin app.
      if (created && departments.length)
        await trx("groupe_departement").insert(
          departments.map((department) => ({ groupe_instructeurs: created.id, department })),
        );
    }
  });

  for (const fixture of SEED_PERSONNES) {
    const email = fixture.email === "dev@localhost.local" ? SEED_EMAIL : fixture.email;
    await db.transaction(async (trx) => {
      let user = await trx("auth_user").where({ email }).first();
      if (!user) {
        [user] = await trx("auth_user")
          .insert({ email, first_names: fixture.first_names, last_name: fixture.last_name })
          .returning("*");
      }
      const bundles = email === SEED_EMAIL ? ["instructeur", "administrateur"] : ["instructeur"];
      await trx("auth_permission_bundle")
        .insert(bundles.map((bundle) => ({ user_id: user.id, bundle })))
        .onConflict(["user_id", "bundle"])
        .ignore();
      const group = await trx("groupe_instructeurs")
        .where({ name: fixture.groupe, demarche_number: SEED_DEMARCHE_NUMBER })
        .first();
      if (group)
        await trx("user_groupe")
          .insert({ user_id: user.id, groupe_instructeurs: group.id })
          .onConflict(["user_id", "groupe_instructeurs"])
          .ignore();
    });
  }
}
