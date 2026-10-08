import type Entreprise from "./database/public/Entreprise.ts";
import type PersonnePhysique from "./database/public/PersonnePhysique.ts";
import type { PersonnePhysiqueInitializer } from "./database/public/PersonnePhysique.ts";

export type PorteurDeProjetPersonnePhysique = { type: "personne_physique" } & Omit<
  PersonnePhysique,
  "id"
>;
export type PorteurDeProjetPersonneMorale = { type: "personne_morale" } & Entreprise;

/** Porteur de projet of a dossier, as read: told apart by its `type`. */
export type PorteurDeProjet = PorteurDeProjetPersonnePhysique | PorteurDeProjetPersonneMorale;

/**
 * Porteur de projet of a dossier, as written. A personne morale is only its SIRET: the
 * entreprise itself is stored beforehand. Undefined when the dossier has no porteur.
 */
export type PorteurDeProjetInitializer =
  | ({ type: "personne_physique" } & Omit<PersonnePhysiqueInitializer, "id">)
  | Pick<PorteurDeProjetPersonneMorale, "type" | "siret">
  | undefined;
