import { createPersonnes, listAllPersonnes } from "@pitchou/server/database/personne.ts";
import type Personne from "@pitchou/types/database/public/Personne.ts";
import type { PersonneInitializer } from "@pitchou/types/database/public/Personne.ts";
import type {
  DossierEntreprisesPersonneInitializersForInsert,
  DossierEntreprisesPersonneInitializersForUpdate,
} from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";
import type { Knex } from "knex";
export async function preparePersonnes(
  dossiers: (
    | DossierEntreprisesPersonneInitializersForInsert
    | DossierEntreprisesPersonneInitializersForUpdate
  )[],
  transaction: Knex.Transaction,
) {
  const allPersonnes = await listAllPersonnes(transaction);
  const personneByEmail = new Map<Personne["email"], Personne>();
  for (const personne of allPersonnes) {
    if (personne.email) personneByEmail.set(personne.email, personne);
  }
  const personnesWithEmail = new Map<PersonneInitializer["email"], PersonneInitializer>();
  const personnesWithoutEmail = new Map<string, PersonneInitializer>();
  const collectPersonne = (personne: PersonneInitializer | undefined) => {
    if (!personne) return;
    if (personne.email) personnesWithEmail.set(personne.email, personne);
    else personnesWithoutEmail.set(`${personne.first_names}|${personne.last_name}`, personne);
  };
  for (const { dossier } of dossiers) {
    collectPersonne(dossier.deposant);
    collectPersonne(dossier.demandeur_personne_physique);
  }

  const getPersonneId = (personne: Personne | PersonneInitializer | undefined) => {
    if (!personne) return;
    if (personne.id) return personne.id;
    if (personne.email) return personneByEmail.get(personne.email)?.id;
    return allPersonnes.find(
      ({ email, last_name, first_names }) =>
        !email && personne.last_name === last_name && personne.first_names === first_names,
    )?.id;
  };
  const personnesToCreate = [
    ...personnesWithEmail.values(),
    ...personnesWithoutEmail.values(),
  ].filter((personne) => !getPersonneId(personne));
  if (personnesToCreate.length > 0) {
    const personneIds = await createPersonnes(personnesToCreate, transaction);
    personnesToCreate.forEach((personne, index) => {
      personne.id = personneIds[index].id;
      if (personne.email) personneByEmail.set(personne.email, personne as Personne);
      else allPersonnes.push(personne as Personne);
    });
  }

  return getPersonneId;
}
