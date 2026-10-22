import { directDatabaseConnection as db } from "@pitchou/server/database.ts";

export const prefix = "Recette notifications 2542";
export async function prepareIdentities() {
  let group = await db("groupe_instructeurs").where({ name: prefix }).first();
  if (!group)
    [group] = await db("groupe_instructeurs")
      .insert({ name: prefix, demarche_number: 88444 })
      .returning("*");
  const people = [];
  for (const role of ["actor", "recipient"]) {
    const email = `notifications-2542-${role}@dev.pitchou.fr`;
    let person = await db("auth_user").where({ email }).first();
    if (!person)
      [person] = await db("auth_user")
        .insert({
          email,
          first_names: "Recette notifications",
          last_name: role === "actor" ? "Auteur" : "Destinataire",
        })
        .returning("*");
    await db("auth_permission_bundle")
      .insert({ user_id: person.id, bundle: "instructeur" })
      .onConflict(["user_id", "bundle"])
      .ignore();
    await db("user_groupe")
      .insert({ user_id: person.id, groupe_instructeurs: group.id })
      .onConflict(["user_id", "groupe_instructeurs"])
      .ignore();
    people.push(person);
  }
  return { group, actor: people[0], recipient: people[1] };
}
export type Identities = Awaited<ReturnType<typeof prepareIdentities>>;

export async function createScenario(label: string, kind: string, identities: Identities) {
  const name = `${prefix} · ${label}`;
  const existing = await db("dossier").where({ name }).first();
  if (existing) return { dossier: existing, fresh: false };
  const dossier = await db.transaction(async (trx) => {
    const [dossier] = await trx("dossier")
      .insert({
        name,
        source: "pitchou",
        depot_date: new Date(),
        enjeu: false,
        primary_department: "test-notifications-2542",
      })
      .returning("*");
    // Other cases exercise the dispatcher without manufacturing unrelated arrivals.
    if (kind !== "arrival")
      await trx("email_notification_groupe_arrival").insert({
        dossier: dossier.id,
        groupe_instructeurs: identities.group.id,
      });
    await trx("groupe_departement")
      .insert({ department: "test-notifications-2542", groupe_instructeurs: identities.group.id })
      .onConflict(["groupe_instructeurs", "department"])
      .ignore();
    await trx("edge_personne_follows_dossier").insert({
      personne: identities.recipient.id,
      dossier: dossier.id,
    });
    if (kind === "assignment")
      await trx("action_dossier").insert({
        dossier: dossier.id,
        type: "dossier_suivi",
        author_personne: identities.actor.id,
        data: { follower: identities.recipient.email },
      });
    if (kind === "novelty")
      await trx("action_dossier").insert({
        dossier: dossier.id,
        type: "avis_modifie",
        author_personne: identities.actor.id,
      });
    await trx.raw("SET CONSTRAINTS ALL IMMEDIATE");
    await trx("email_notification_outbox")
      .where({ dossier: dossier.id, status: "pending" })
      .update({ due_at: trx.raw("next_pitchou_email_delivery(clock_timestamp())") });
    return dossier;
  });
  return { dossier, fresh: true };
}

export async function grantOwnerAccess(group: string) {
  const users = await db("auth_user")
    .whereIn("email", ["dev@localhost.local", "camille.rousseau@dev.pitchou.fr"])
    .select("id");
  for (const user of users)
    await db("user_groupe")
      .insert({ user_id: user.id, groupe_instructeurs: group })
      .onConflict(["user_id", "groupe_instructeurs"])
      .ignore();
}
