import type { Knex } from "knex";

import { savePorteursDeProjetAndActeurs } from "@pitchou/server/database/dossier_acteur.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { EntrepriseSiret } from "@pitchou/types/database/public/Entreprise.ts";
import type { DossierActeurData, Involvement } from "@pitchou/types/dossierActeur.ts";
import type { PorteurDeProjetInitializer } from "@pitchou/types/porteurDeProjet.ts";

import type { SeedPersonne } from "../../fixtures/dossiers/types.ts";

export type SeedActeurs = {
  /** The Démarche Numérique demandeur, i.e. the bénéficiaire. */
  demandeur?: SeedPersonne;
  mandataire?: SeedPersonne;
  personneContact?: SeedPersonne;
};

function personne({ last_name, first_names, email, address, phone, role }: SeedPersonne) {
  return {
    last_name,
    first_names,
    email,
    address: address ?? null,
    phone: phone ?? null,
    role: role ?? null,
  };
}

/**
 * The porteur de projet and the acteurs of a seeded dossier, as the Démarche Numérique
 * synchronization fills them: the porteur is its personne physique, else its SIRET.
 */
export async function seedPorteurDeProjetAndActeurs(
  transaction: Knex.Transaction,
  dossierId: DossierId,
  porteurPersonne: SeedPersonne | undefined,
  siret: string | null | undefined,
  { demandeur, mandataire, personneContact }: SeedActeurs,
): Promise<void> {
  const porteur: PorteurDeProjetInitializer = porteurPersonne
    ? { type: "personne_physique", ...personne(porteurPersonne) }
    : siret
      ? { type: "personne_morale", siret: siret as EntrepriseSiret }
      : undefined;
  const acteurs: DossierActeurData[] = [];
  if (demandeur) {
    const involvements: Involvement[] = mandataire
      ? ["beneficiaire_demarche_numerique"]
      : ["beneficiaire_demarche_numerique", "deposant"];
    // The Démarche Numérique demandeur is the porteur when it is a personne physique.
    acteurs.push(
      porteurPersonne
        ? { involvements, porteur: true }
        : { involvements, personne: personne(demandeur) },
    );
  }
  if (mandataire) {
    acteurs.push({ involvements: ["mandataire", "deposant"], personne: personne(mandataire) });
  }
  if (personneContact) {
    acteurs.push({ involvements: ["personne_contact"], personne: personne(personneContact) });
  }
  await savePorteursDeProjetAndActeurs(
    new Map([[dossierId, porteur]]),
    new Map([[dossierId, acteurs]]),
    transaction,
    { historique: false },
  );
}
