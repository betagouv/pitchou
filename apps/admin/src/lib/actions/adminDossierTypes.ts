export type AdminDossierSummary = {
  id: number;
  name: string | null;
  demarche_numerique_number: string | null;
  depot_date: string;
  phase: string;
  demandeur_last_name: string | null;
  demandeur_first_names: string | null;
  demandeur_entreprise: string | null;
  groupe_name: string | null;
};

export type DossiersQuery = {
  search: string;
  /** "" for every phase */
  phase: string;
  /** "" | "pitchou" | "dn" */
  source: string;
  page: number;
  pageSize: number;
};

export type DossiersPage = {
  dossiers: AdminDossierSummary[];
  total: number;
};

export type AdminGroupeInstructeurs = {
  id: string;
  name: string;
  demarche_number: number | null;
};

export type AdminPhaseHistoryEntry = {
  phase: string;
  timestamp: string;
  caused_by_email: string | null;
  demarche_numerique_agent_email: string | null;
};

export type AdminPieceJointe = {
  id: string;
  name: string;
  media_type: string | null;
  size: number | null;
  created_at: string;
  demarche_numerique_created_at: string | null;
};

export type AdminIdentiteDossierType = "demandeur" | "mandataire" | "representant";

export type AdminDossierIdentite = {
  type: AdminIdentiteDossierType;
  last_name: string | null;
  first_names: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
};

export type AdminDemandeurPersonneMorale = {
  siret: string;
  legal_name: string | null;
  address: string | null;
  postal_code: string | null;
  department: string | null;
  region: string | null;
};

type AdminDossierRelationsPayloadBase = {
  groupe_instructeurs: string;
  identites: AdminDossierIdentite[];
};

export type AdminDossierRelationsPayload = AdminDossierRelationsPayloadBase &
  (
    | {
        demandeur_type: "personne_physique";
        demandeur_personne_physique: {
          last_name: string;
          first_names: string;
          email: string | null;
          address: string | null;
          phone: string | null;
          role: string | null;
        };
        demandeur_personne_morale: null;
      }
    | {
        demandeur_type: "personne_morale";
        demandeur_personne_physique: null;
        demandeur_personne_morale: AdminDemandeurPersonneMorale;
      }
  );

export type AdminDossierDetail = {
  dossier: Record<string, unknown> & {
    id: number;
    name: string | null;
    demarche_numerique_number: string | null;
    demarche_number: number | null;
    depot_date: string;
  };
  managedByDn: boolean;
  phase: string;
  demandeur_personne_physique: {
    last_name: string | null;
    first_names: string | null;
    email: string | null;
    address: string | null;
    phone: string | null;
    role: string | null;
  } | null;
  demandeur_personne_morale: AdminDemandeurPersonneMorale | null;
  groupe: { id: string; name: string } | null;
  identites: AdminDossierIdentite[];
  evenementsPhase: AdminPhaseHistoryEntry[];
  piecesJointes: AdminPieceJointe[];
  especesImpactees: { id: string; name: string; media_type: string | null } | null;
};

export type AdminDossierCreationPayload = {
  name: string;
  depot_date: string;
  phase: string;
  groupe_instructeurs: string;
  demandeur_personne_physique: {
    last_name: string;
    first_names: string;
    email: string | null;
  } | null;
  demandeur_personne_morale: { siret: string; legal_name: string | null } | null;
  columns?: Record<string, unknown>;
};

export type AdminDossierUpdatePayload = {
  columns?: Record<string, unknown>;
  evenementsPhase?: { phase: string; timestamp: string }[];
  relations?: AdminDossierRelationsPayload;
};
