import type { AdminDossierRelations } from "./dossier_admin_relations.ts";

import type { DossierPhase } from "@pitchou/types/API_Pitchou.ts";
import type { DossierMutator } from "@pitchou/types/database/public/Dossier.ts";

export type AdminDossierCreation = {
  name: string;
  depot_date: Date;
  phase: DossierPhase;
  relations: AdminDossierRelations;
  /** Additional columns, keys restricted to ADMIN_EDITABLE_DOSSIER_COLUMNS. */
  columns?: DossierMutator;
};

export type AdminPhaseEvent = { phase: DossierPhase; timestamp: Date };

export type AdminDossierUpdate = {
  columns?: DossierMutator;
  evenementsPhase?: AdminPhaseEvent[];
  relations?: AdminDossierRelations;
};
