import type PersonnePhysique from "./database/public/PersonnePhysique.ts";
import type { PersonnePhysiqueInitializer } from "./database/public/PersonnePhysique.ts";

/** Known values of dossier_acteur.involvement, which stays free text in the database for now. */
export type Involvement =
  | "deposant"
  | "mandataire"
  | "personne_contact"
  | "beneficiaire_demarche_numerique";

export const involvementLabels: Record<Involvement, string> = {
  deposant: "Déposant",
  mandataire: "Mandataire",
  personne_contact: "Personne contact",
  beneficiaire_demarche_numerique: "Bénéficiaire Démarche Numérique",
};

/** A person involved in a dossier, as read: one entry per person, with all their involvements. */
export type DossierActeur = { involvements: Involvement[] } & Omit<PersonnePhysique, "id">;

/**
 * A person involved in a dossier, as written. `porteur: true` points to the personne_physique
 * of the porteur de projet instead of creating another one.
 */
export type DossierActeurData = { involvements: Involvement[] } & (
  | { personne: Omit<PersonnePhysiqueInitializer, "id"> }
  | { porteur: true }
);
