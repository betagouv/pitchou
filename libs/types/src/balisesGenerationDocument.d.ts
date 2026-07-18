import { DossierFull } from "./API_Pitchou";

/**
 * Type for a species in a list of species
 */
interface Espece {
  nomVernaculaire: string;
  nomScientifique: string;
  liste_impacts_quantifiés: string[];
  estCNPN: boolean;
  estMinistérielle: boolean;
}

/**
 * Type for an item in the list of species by impact
 */
interface EspeceByImpact {
  impact: string;
  liste_espèces: Espece[];
  liste_noms_impacts_quantifiés: string[];
}

/**
 * Type for the scientific data of the dossier if it is of a scientific nature
 */
interface ScientificData {
  type_demande: string[] | null;
  bilan_antérieur: boolean | null;
  finalité_demande: string[] | null;
  description_protocole_suivi: string | null;
  mode_capture: string[] | null;
  modalités_source_lumineuses: string | null;
  modalités_marquage: string | null;
  modalités_transport: string | null;
  périmètre_intervention: string | null;
  intervenants: unknown | null;
  précisions_autres_intervenants: string | null;
}

/**
 * Utility functions for formatting
 */
interface UtilityFunctions {
  afficher_nombre: (n: any, precision?: number) => string | undefined;
  formatter_date: (date: any, formatString: string) => string | undefined;
  formatter_date_simple: (date: any) => string | undefined;
}

/**
 * Main type for the document generation tags
 *
 * Contains all the data available to replace the tags in the templates
 * @remark Warning, changing the return type of this function can break the rendering of existing documents.
 * @see {@link https://betagouv.github.io/pitchou/instruction/document-types/creation.html}
 **/
export type BalisesGenerationDocument = {
  nom: string | null;
  demandeur: {
    adresse: string;
    nom: string;
    toString: () => string;
  };
  activité_principale: string | null;
  description: string | null;
  localisation: string;
  date_dépôt: Date;

  département_principal: string | undefined;
  liste_départements: string[] | undefined;

  régime_autorisation_environnementale_renseigné: boolean;
  régime_autorisation_environnementale: boolean | "Non renseigné";

  scientifique: ScientificData;

  justification_absence_autre_solution_satisfaisante: string | null;
  motif_dérogation: string | null;
  justification_motif_dérogation: string | null;
  liste_espèces_par_impact: EspeceByImpact[] | undefined;
  mesures_erc_prévues: boolean | "Non renseigné";
  mesures_erc_prévues_renseigné: boolean;

  hirondelles?: {
    nids_détruits: number | null;
    nids_compensés: number | null;
  };

  cigognes?: {
    nids_détruits: number | null;
    nids_compensés: number | null;
  };

  date_début_intervention: Date | null;
  date_fin_intervention: Date | null;
  date_mise_en_service: Date | null;
  durée_intervention: number | null;

  date_début_consultation_public: Date | null;
  date_fin_consultation_public: Date | null;

  identifiant_onagre: string | null;
  numéro_dossier: string | null;
  /** @deprecated Use {numéro_dossier} from Démarche Numérique */
  identifiant_pitchou: number;

  commentaire_instruction: string;
  enjeu: boolean;
};
