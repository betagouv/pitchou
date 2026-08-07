import type { EntrepriseSiret } from "@pitchou/types/database/public/Entreprise.ts";
import type { GroupeInstructeursId } from "@pitchou/types/database/public/GroupeInstructeurs.ts";

export type AdminIdentiteDossierType = "demandeur" | "mandataire" | "representant";
export type AdminDossierIdentite = {
  type: AdminIdentiteDossierType;
  last_name: string | null;
  first_names: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
};
export type AdminDemandeurPersonnePhysiqueRelations = {
  last_name: string;
  first_names: string;
  email: string | null;
  address: string | null;
  phone: string | null;
  role: string | null;
};
export type AdminDemandeurPersonneMoraleRelations = {
  siret: EntrepriseSiret;
  legal_name: string | null;
  address: string | null;
  postal_code: string | null;
  department: string | null;
  region: string | null;
};
type BaseRelations = {
  groupe_instructeurs: GroupeInstructeursId;
  identites: AdminDossierIdentite[];
};
export type AdminDossierRelations = BaseRelations &
  (
    | {
        demandeur_type: "personne_physique";
        demandeur_personne_physique: AdminDemandeurPersonnePhysiqueRelations;
        demandeur_personne_morale: null;
      }
    | {
        demandeur_type: "personne_morale";
        demandeur_personne_physique: null;
        demandeur_personne_morale: AdminDemandeurPersonneMoraleRelations;
      }
  );
