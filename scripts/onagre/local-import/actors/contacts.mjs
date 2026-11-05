import { writeRecord } from "../writer.mjs";
import { identity, assertPrivatePerson } from "./identity.mjs";

export async function writeContacts(client, sample, dossierId) {
  const key = sample.identity.key,
    results = [];
  for (const contact of sample.proposal.contacts ?? []) {
    const personKey = `${contact.sourceKey}:person`,
      actorKey = `${contact.sourceKey}:contact`;
    const person = await identity(client, key, personKey),
      actor = await identity(client, key, actorKey);
    if (Boolean(person) !== Boolean(actor))
      throw new Error("Incomplete imported contact ownership");
    if (person) {
      const current = (
        await client.query("SELECT * FROM dossier_acteur WHERE id=$1 FOR UPDATE", [actor.target_id])
      ).rows[0];
      if (
        !current ||
        String(current.personne_physique) !== person.target_id ||
        current.dossier !== dossierId ||
        current.involvement !== "personne_contact"
      )
        throw new Error("Imported contact was deleted or reassigned; reconcile before importing");
      await assertPrivatePerson(client, person.target_id, dossierId);
    }
    const saved = await writeRecord(
      client,
      key,
      personKey,
      "personne_physique",
      contact.values,
      {},
    );
    results.push(
      saved,
      await writeRecord(
        client,
        key,
        actorKey,
        "dossier_acteur",
        {},
        {
          dossier: dossierId,
          personne_physique: Number(saved.targetId),
          involvement: "personne_contact",
        },
      ),
    );
  }
  return results;
}
