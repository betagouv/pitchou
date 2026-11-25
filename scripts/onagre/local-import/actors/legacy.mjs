import { isDeepStrictEqual } from "node:util";
import { comparable } from "../merge.mjs";
import { identity, assertPrivatePerson } from "./identity.mjs";

function unchanged(lastFields, current) {
  return Object.entries(lastFields).every(([key, value]) =>
    isDeepStrictEqual(comparable(current[key], key), comparable(value, key)),
  );
}

/**
 * Removes prepared contacts that an earlier import wrote and that the source-derived people now
 * replace. A contact edited, reassigned or shared since then stops the import instead.
 */
export async function removeLegacyContacts(client, sample, dossierId) {
  const key = sample.identity.key,
    results = [];
  for (const contact of sample.proposal.contacts ?? []) {
    const personKey = `${contact.sourceKey}:person`,
      actorKey = `${contact.sourceKey}:contact`;
    const person = await identity(client, key, personKey),
      actor = await identity(client, key, actorKey);
    if (!person && !actor) continue;
    if (!person || !actor) throw new Error("Incomplete imported contact ownership");
    const currentActor = (
      await client.query("SELECT * FROM dossier_acteur WHERE id=$1 FOR UPDATE", [actor.target_id])
    ).rows[0];
    const currentPerson = (
      await client.query("SELECT * FROM personne_physique WHERE id=$1 FOR UPDATE", [
        person.target_id,
      ])
    ).rows[0];
    if (
      !currentActor ||
      !currentPerson ||
      currentActor.dossier !== dossierId ||
      String(currentActor.personne_physique) !== person.target_id ||
      currentActor.involvement !== "personne_contact" ||
      !unchanged(person.last_fields, currentPerson)
    )
      throw new Error(
        `Former contact ${contact.sourceKey} was edited, deleted or reassigned; reconcile before importing`,
      );
    await assertPrivatePerson(client, person.target_id, dossierId);
    const otherUses = await client.query(
      `SELECT 1 FROM dossier_acteur WHERE personne_physique=$1 AND id<>$2
      UNION ALL SELECT 1 FROM porteur_de_projet WHERE personne_physique=$1`,
      [person.target_id, actor.target_id],
    );
    if (otherUses.rows.length > 0)
      throw new Error(
        `Former contact ${contact.sourceKey} now has another role; reconcile before importing`,
      );
    await client.query("DELETE FROM dossier_acteur WHERE id=$1", [actor.target_id]);
    await client.query("DELETE FROM personne_physique WHERE id=$1", [person.target_id]);
    await client.query(
      "DELETE FROM onagre_local_import.identity WHERE dossier_key=$1 AND source_key = ANY($2)",
      [key, [personKey, actorKey]],
    );
    for (const [sourceKey, table, targetId] of [
      [actorKey, "dossier_acteur", actor.target_id],
      [personKey, "personne_physique", person.target_id],
    ])
      results.push({ sourceKey, table, targetId, status: "removed", preserved: [] });
  }
  return results;
}
