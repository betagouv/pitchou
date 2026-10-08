import type Dossier from "../database/public/Dossier.ts";
import type { DossierSource } from "../dossierSource.ts";
import type { DossierDemarcheNumerique88444 } from "../demarche-numerique/Demarche88444.ts";
import type { DossierAccess, FrontEndDecisionAdministrative } from "./dossierDetails.ts";
import type { PorteurDeProjet } from "../porteurDeProjet.ts";

type DossierPersonnesImpliqueesSummary = {
  porteur_de_projet: PorteurDeProjet | null;
  deposant_last_name: string;
  deposant_first_names: string;
};

export type DossierPersonnesImpliqueesFull = DossierPersonnesImpliqueesSummary & {
  representative_last_name: string | null;
  representative_first_names: string | null;
  representative_email: string | null;
  representative_phone: string | null;
  representative_role: string | null;
  mandataire_last_name: string | null;
  mandataire_first_names: string | null;
  mandataire_email: string | null;
  mandataire_phone: string | null;
  mandataire_role: string | null;
};

export type DossierPhase =
  | "Accompagnement amont"
  | "Étude recevabilité"
  | "Instruction"
  | "Contrôle"
  | "Classé sans suite"
  | "Obligations terminées";

export type DossierNextActionExpectedFrom =
  | "Instructeur"
  | "CNPN/CSRPN"
  | "Pétitionnaire"
  | "Consultation du public"
  | "Préfet-e"
  | "Tierce personne/administration";

type DossierLocalisation = {
  communes: { name: string; code: string; postalCode: string }[] | null | undefined;
  departments: string[] | null | undefined;
  regions: string[] | null | undefined;
  location_scope?: Dossier["location_scope"];
  primary_department?: Dossier["primary_department"];
};

export type DossierCommonData = DossierLocalisation & { source: DossierSource } & {
  main_activite: DossierDemarcheNumerique88444["Activité principale"] | null;
  /** Code of the Pitchou activity the raw label resolves to (« autre » when unmapped). */
  activite_code: string | null;
  /** Display name of that activity, decided by administrators. */
  activite_label: string | null;
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
  | "next_due_date"
  | "onagre_demande_identifier"
> & { phase: DossierPhase; phase_start_date: Date } & DossierCommonData &
  DossierPersonnesImpliqueesSummary & {
    access: DossierAccess;
    decisionsAdministratives: FrontEndDecisionAdministrative[] | undefined;
    avisExperts: { expert: string | null; hasSaisineFile?: boolean; hasAvisFile: boolean }[];
    especesImpacteesCD_REF: string[];
    especesImpacteesRenseignees: boolean;
    /** Content of the dossier's most recent commentaire, omitted for foreign readers. */
    latestCommentaire?: string | null;
  };
