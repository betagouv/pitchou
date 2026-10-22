import { randomUUID } from "node:crypto";
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
    let person = await db("personne").where({ email }).first();
    if (!person)
      [person] = await db("personne")
        .insert({
          email,
          first_names: "Recette notifications",
          last_name: role === "actor" ? "Auteur" : "Destinataire",
          access_code: randomUUID(),
        })
        .returning("*");
    let cap = await db("cap_dossier").where({ personne_cap: person.access_code }).first();
    if (!cap)
      [cap] = await db("cap_dossier").insert({ personne_cap: person.access_code }).returning("*");
    const edge = { cap_dossier: cap.cap, groupe_instructeurs: group.id };
    if (!(await db("edge_cap_dossier__groupe_instructeurs").where(edge).first()))
      await db("edge_cap_dossier__groupe_instructeurs").insert(edge);
    people.push({ ...person, cap: cap.cap });
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
      .insert({ name, source: "pitchou", depot_date: new Date(), enjeu: false })
      .returning("*");
    // Other cases exercise the dispatcher without manufacturing unrelated arrivals.
    if (kind !== "arrival")
      await trx("email_notification_groupe_arrival").insert({
        dossier: dossier.id,
        groupe_instructeurs: identities.group.id,
      });
    await trx("edge_groupe_instructeurs__dossier").insert({
      dossier: dossier.id,
      groupe_instructeurs: identities.group.id,
    });
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
  const caps = await db("cap_dossier as c")
    .join("personne as p", "p.access_code", "c.personne_cap")
    .whereIn("p.email", ["dev@localhost.local", "camille.rousseau@dev.pitchou.fr"])
    .select("c.cap");
  for (const cap of caps) {
    const edge = { cap_dossier: cap.cap, groupe_instructeurs: group };
    if (!(await db("edge_cap_dossier__groupe_instructeurs").where(edge).first()))
      await db("edge_cap_dossier__groupe_instructeurs").insert(edge);
  }
}
