import type { AdminDossierRelations } from "./dossier_admin_relations.ts";

import type { DossierPhase } from "@pitchou/types/API_Pitchou.ts";
import type { DossierMutator } from "@pitchou/types/database/public/Dossier.ts";
import type { EntrepriseInitializer } from "@pitchou/types/database/public/Entreprise.ts";
import type { GroupeInstructeursId } from "@pitchou/types/database/public/GroupeInstructeurs.ts";

export type AdminDemandeurPersonnePhysique = {
  first_names: string;
  last_name: string;
  email?: string | null;
};

export type AdminDossierCreation = {
  name: string;
  depot_date: Date;
  phase: DossierPhase;
  groupe_instructeurs: GroupeInstructeursId;
  demandeur_personne_physique?: AdminDemandeurPersonnePhysique | null;
  demandeur_personne_morale?: EntrepriseInitializer | null;
  /** Additional columns, keys restricted to ADMIN_EDITABLE_DOSSIER_COLUMNS. */
  columns?: DossierMutator;
};

export type AdminPhaseEvent = { phase: DossierPhase; timestamp: Date };

export type AdminDossierUpdate = {
  columns?: DossierMutator;
  evenementsPhase?: AdminPhaseEvent[];
  relations?: AdminDossierRelations;
};
