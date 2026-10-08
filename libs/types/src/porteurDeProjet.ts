import type Entreprise from "./database/public/Entreprise.ts";
import type { EntrepriseSiret } from "./database/public/Entreprise.ts";
import type PersonnePhysique from "./database/public/PersonnePhysique.ts";
import type { PersonnePhysiqueInitializer } from "./database/public/PersonnePhysique.ts";

/**
 * Porteur de projet of a dossier, before it is stored.
 * Undefined when the dossier has no porteur.
 */
export type PorteurDeProjetData =
  | { personne_physique: Omit<PersonnePhysiqueInitializer, "id"> }
  | { personne_morale: EntrepriseSiret }
  | undefined;

export type PorteurDeProjetPersonnePhysique = { type: "personne_physique" } & Omit<
  PersonnePhysique,
  "id"
>;
export type PorteurDeProjetPersonneMorale = { type: "personne_morale" } & Entreprise;

/** Porteur de projet of a dossier, as read: told apart by its `type`. */
export type PorteurDeProjet = PorteurDeProjetPersonnePhysique | PorteurDeProjetPersonneMorale;
