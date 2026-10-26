import type { DossierFull, DossierPhase } from "./API_Pitchou.ts";
import type AvisExpert from "./database/public/AvisExpert.ts";
import type DecisionAdministrative from "./database/public/DecisionAdministrative.ts";
import type Controle from "./database/public/Controle.ts";

export type DossiersExportScope = "service" | "followed" | "france";
export type DossiersExportFormat = "ods" | "csv";

export type ExportEspece = {
  cd_ref: string;
  noms_vernaculaires: string[] | null;
  noms_scientifiques: string[] | null;
  espece_cnpn: boolean | null;
  espece_ministerielle: boolean | null;
};

export type ExportDossier = Pick<
  DossierFull,
  | "id"
  | "demarche_numerique_number"
  | "name"
  | "depot_date"
  | "ddep_depot_date"
  | "main_activite"
  | "activite_label"
  | "primary_department"
  | "communes"
  | "departments"
  | "regions"
  | "location_scope"
  | "linked_to_ae_regime"
  | "ddep_required"
  | "er_mesures_sufficient"
  | "enjeu"
> & {
  demandeur_personne_physique_last_name: string | null;
  demandeur_personne_physique_first_names: string | null;
  demandeur_personne_morale_legal_name: string | null;
  demandeur_personne_morale_siret: string | null;
  readOnly?: boolean;
  phase: DossierPhase;
  followers: string[];
  especes: ExportEspece[];
  avis: Pick<
    AvisExpert,
    "expert" | "saisine_date" | "saisine_fichier" | "avis_date" | "avis_fichier" | "avis"
  >[];
  decisions: Pick<DecisionAdministrative, "number" | "type" | "signature_date">[];
  prescriptions: { controles: Pick<Controle, "controle_date" | "result">[] }[];
};
