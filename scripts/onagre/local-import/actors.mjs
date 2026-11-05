import { writePorteur } from "./actors/porteur.mjs";
import { writeContacts } from "./actors/contacts.mjs";
export { validateActors } from "./actors/validation.mjs";

export async function writeActors(client, sample, dossierId) {
  return [
    ...(await writePorteur(client, sample, dossierId)),
    ...(await writeContacts(client, sample, dossierId)),
  ];
}
