import { writePorteur } from "./actors/porteur.mjs";
import { writeContacts } from "./actors/contacts.mjs";
import { removeLegacyContacts } from "./actors/legacy.mjs";
import { sourceActors } from "./actors/source.mjs";
export { validateActors } from "./actors/validation.mjs";

/**
 * Applies the owner's pétitionnaire decision when the source category is known; otherwise the
 * prepared porteur and contacts apply unchanged.
 */
export function actorProposal(sample) {
  const derived = sourceActors(sample);
  if (!derived)
    return { porteur: sample.proposal.porteur, contacts: sample.proposal.contacts ?? [] };
  return { porteur: derived.porteur, contacts: derived.people, legacyContacts: true };
}

/** The decision replaces only the former applicant contact; any other prepared contact is refused. */
export function assertReplaceableContacts(sample, proposal = actorProposal(sample)) {
  if (
    proposal.legacyContacts &&
    (sample.proposal.contacts ?? []).some(
      ({ sourceKey }) => !sourceKey.endsWith(":applicant-contact"),
    )
  )
    throw new Error("Only former applicant contacts can be replaced by the pétitionnaire decision");
}

export async function writeActors(client, sample, dossierId) {
  const proposal = actorProposal(sample);
  return [
    ...(await writePorteur(client, sample, dossierId, proposal.porteur)),
    ...(proposal.legacyContacts ? await removeLegacyContacts(client, sample, dossierId) : []),
    ...(await writeContacts(client, sample, dossierId, proposal.contacts)),
  ];
}
