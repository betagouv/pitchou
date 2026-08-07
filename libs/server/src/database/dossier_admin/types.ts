import type { DossierPhase } from "@pitchou/types/API_Pitchou.ts";
import type { DossierMutator } from "@pitchou/types/database/public/Dossier.ts";
import type { AdminDossierRelations } from "./relationTypes.ts";

export type AdminDossierCreation = {
  name: string;
  depot_date: Date;
  phase: DossierPhase;
  relations: AdminDossierRelations;
  columns?: DossierMutator;
};
export type AdminPhaseEvent = { phase: DossierPhase; timestamp: Date };
export type AdminDossierUpdate = {
  columns?: DossierMutator;
  evenementsPhase?: AdminPhaseEvent[];
  relations?: AdminDossierRelations;
};
