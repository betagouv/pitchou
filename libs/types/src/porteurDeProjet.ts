import type { EntrepriseSiret } from "./database/public/Entreprise.ts";
import type { PersonnePhysiqueInitializer } from "./database/public/PersonnePhysique.ts";

/**
 * Porteur de projet of a dossier, before it is stored.
 * Undefined when the dossier has no porteur.
 */
export type PorteurDeProjetData =
  | { personne_physique: Omit<PersonnePhysiqueInitializer, "id"> }
  | { personne_morale: EntrepriseSiret }
  | undefined;
