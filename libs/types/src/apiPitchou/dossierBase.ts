import type Dossier from "../database/public/Dossier.ts";
import type { DossierSource } from "../dossierSource.ts";
import type { DossierDemarcheNumerique88444 } from "../demarche-numerique/Demarche88444.ts";
import type { FrontEndDecisionAdministrative } from "./dossierDetails.ts";

type DossierPersonnesImpliqueesSummary = {
  deposant_last_name: string;
  deposant_first_names: string;
  demandeur_personne_physique_last_name: string;
  demandeur_personne_physique_first_names: string;
  demandeur_personne_morale_legal_name: string;
  demandeur_personne_morale_siret: string;
};

export type DossierPersonnesImpliqueesFull = DossierPersonnesImpliqueesSummary & {
  demandeur_address: string;
  deposant_email: string | null;
  demandeur_personne_physique_email: string | null;
  demandeur_personne_physique_address: string | null;
  demandeur_personne_physique_phone: string | null;
  demandeur_personne_physique_role: string | null;
  demandeur_personne_morale_siren: string | null;
  demandeur_personne_morale_legal_form: string | null;
  demandeur_personne_morale_naf_code: string | null;
  demandeur_personne_morale_naf_label: string | null;
  demandeur_personne_morale_creation_date: string | null;
  demandeur_personne_morale_admin_status: string | null;
  demandeur_personne_morale_headcount: string | null;
  demandeur_personne_morale_share_capital: string | null;
  demandeur_personne_morale_insee_code: string | null;
  demandeur_personne_morale_postal_code: string | null;
  demandeur_personne_morale_department: string | null;
  demandeur_personne_morale_region: string | null;
  representative_last_name: string | null;
  representative_first_names: string | null;
  representative_email: string | null;
  representative_phone: string | null;
  representative_role: string | null;
  mandataire_last_name: string | null;
  mandataire_first_names: string | null;
  mandataire_email: string | null;
};

export type DossierPhase =
  | "Accompagnement amont"
  | "Étude recevabilité DDEP"
  | "Instruction"
  | "Contrôle"
  | "Classé sans suite"
  | "Obligations terminées";

export type DossierNextActionExpectedFrom =
  | "Instructeur"
  | "CNPN/CSRPN"
  | "Pétitionnaire"
  | "Consultation du public"
  | "Autre administration"
  | "Autre"
  | "Personne";

type DossierLocalisation = {
  communes: { name: string; code: string; postalCode: string }[] | null | undefined;
  departments: string[] | null | undefined;
  regions: string[] | null | undefined;
  location_scope?: Dossier["location_scope"];
  primary_department?: Dossier["primary_department"];
};

export type DossierCommonData = DossierLocalisation & { source: DossierSource } & {
  main_activite: DossierDemarcheNumerique88444["Activité principale"] | null;
};

export type GeoJSONGeometry = {
  type: string;
  coordinates?: unknown;
  geometries?: unknown;
};

export type GeoJSONFeature = {
  type: "Feature";
  geometry: GeoJSONGeometry;
  properties: Record<string, unknown> | null;
};

export type GeoJSONFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
};

export type DossierSummary = Pick<
  Dossier,
  | "id"
  | "demarche_numerique_number"
  | "name"
  | "depot_date"
  | "enjeu"
  | "linked_to_ae_regime"
  | "next_action_expected_from"
  | "free_comment"
  | "onagre_demande_identifier"
> & { phase: DossierPhase; phase_start_date: Date } & DossierCommonData &
  DossierPersonnesImpliqueesSummary & {
    decisionsAdministratives: FrontEndDecisionAdministrative[] | undefined;
    avisExperts: { expert: string | null; hasSaisineFile: boolean; hasAvisFile: boolean }[];
    especesImpacteesRenseignees: boolean;
  };
