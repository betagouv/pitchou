import type { Knex } from "knex";

import { savePorteursDeProjet } from "@pitchou/server/database/porteur_de_projet.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { EntrepriseSiret } from "@pitchou/types/database/public/Entreprise.ts";
import type { PorteurDeProjetInitializer } from "@pitchou/types/porteurDeProjet.ts";

import type { SeedPersonne } from "../../fixtures/dossiers/types.ts";

/** The porteur de projet of a seeded dossier: its personne physique, else its SIRET. */
export async function seedPorteurDeProjet(
  transaction: Knex.Transaction,
  dossierId: DossierId,
  personne: SeedPersonne | undefined,
  siret: string | null | undefined,
): Promise<void> {
  const porteur: PorteurDeProjetInitializer = personne
    ? {
        type: "personne_physique",
        last_name: personne.last_name,
        first_names: personne.first_names,
        email: personne.email,
        address: personne.address ?? null,
        phone: personne.phone ?? null,
        role: personne.role ?? null,
      }
    : siret
      ? { type: "personne_morale", siret: siret as EntrepriseSiret }
      : undefined;
  await savePorteursDeProjet(new Map([[dossierId, porteur]]), transaction);
}
