import type { DossierAccess, DossierFull, DossierPhase } from "./API_Pitchou.ts";
import type { DossierId } from "./database/public/Dossier.ts";

export type ProjetMembership = { id: string; name: string; demandeLabel: string };

export type DossierDemande = {
  id: DossierId;
  label: string;
  phase: DossierPhase;
};

export type DemandeRevision = { id: string; recorded_at: string };

export type DossierWorkspace = {
  projet: { id: string; name: string } | null;
  access: DossierAccess;
  demandes: DossierDemande[];
};

export type DemandeVersion = {
  revision: DemandeRevision | null;
  dossier: DossierFull;
  commentaires: {
    id: string;
    content: string;
    created_at: Date | string;
    author_email: string | null;
  }[];
};
