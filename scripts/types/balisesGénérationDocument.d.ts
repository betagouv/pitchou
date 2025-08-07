import {DossierComplet} from './API_Pitchou'


/**
 * Type pour une espèce dans une liste d'espèces
 */
interface Espece {
  nomVernaculaire: string;
  nomScientifique: string;
  liste_impacts_quantifiés: string[];
}

/**
 * Type pour un élément de la liste des espèces par impact
 */
interface EspeceParImpact {
  impact: string;
  liste_espèces: Espece[];
  liste_noms_impacts_quantifiés: string[];
}

/**
 * Type pour les données scientifiques du dossier s'il est à caractère scientifique
 */
interface DonneesScientifiques {
  type_demande: string[] | null;
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
 * Fonctions utilitaires pour le formatage
 */
interface FonctionsUtilitaires {
  afficher_nombre: (n: any, precision?: number) => string | undefined;
  formatter_date: (date: any, formatString: string) => string | undefined;
  formatter_date_simple: (date: any) => string | undefined;
}

/**
 * Type principal pour les balises de génération de documents
 * 
 * Contient toutes les données disponibles pour remplacer les balises dans les templates
 * @remark Attention, modifier le type de retour de cette fonction peut casser le rendu des documents existants.
 * @see {@link https://betagouv.github.io/pitchou/instruction/document-types/creation.html}
 **/
export interface BalisesGénérationDocument extends FonctionsUtilitaires {
  nom: string | null;
  demandeur: {
    adresse: string
    nom: string
    toString: () => string
  }
  activité_principale: string | null;
  description: string | null;
  localisation: string;
  date_dépôt: Date;
  
  département_principale: string | undefined
  liste_départements: string[] | undefined

  régime_autorisation_environnementale_renseigné: boolean;
  régime_autorisation_environnementale: boolean | 'Non renseigné' ;
  
  scientifique: DonneesScientifiques;

  justification_absence_autre_solution_satisfaisante: string | null;
  motif_dérogation: string | null;
  justification_motif_dérogation: string | null;
  liste_espèces_par_impact: EspeceParImpact[] | undefined;
  mesures_erc_prévues: boolean | 'Non renseigné';
  mesures_erc_prévues_renseigné: boolean;

  date_début_intervention: Date | null;
  date_fin_intervention: Date | null;
  durée_intervention: number | null;

  date_début_consultation_public: Date | null;

  identifiant_onagre: string | null;
  identifiant_pitchou: number;

  commentaire_instruction: string;
  enjeu_politique: boolean;
  enjeu_écologique: boolean;
}
