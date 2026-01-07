import Dossier from './database/public/Dossier.ts'
import { DossierDemarcheNumerique88444 } from './démarche-numérique/Démarche88444.ts'
import Fichier from './database/public/Fichier.ts'
import ÉvènementPhaseDossier from './database/public/ÉvènementPhaseDossier.ts'
import DécisionAdministrative from './database/public/DécisionAdministrative.ts'
import Prescription from './database/public/Prescription.ts'
import Contrôle from './database/public/Contrôle.ts'
import AvisExpert from './database/public/AvisExpert.ts'


type DossierPersonnesImpliquéesRésumé = {
    déposant_nom: string;
    déposant_prénoms: string;
    demandeur_personne_physique_nom: string;
    demandeur_personne_physique_prénoms: string;
    demandeur_personne_morale_raison_sociale: string;
    demandeur_personne_morale_siret: string
}

type DossierPersonnesImpliquéesComplet =  DossierPersonnesImpliquéesRésumé & {
    demandeur_adresse: string
    déposant_email: string | null;
    demandeur_personne_physique_email: string | null;
}

/**
 * On génère automatiquement les types des propriétés d'un Dossier via Kanel
 * On a choisi d'utiliser un type `string` pour les propriétés
 * 'phase' et 'prochaine_action_attendue_par'
 * pour plus de flexibilité (au lieu d'un enum).
 * 
 * On surcharge ici ces propriétés pour contraindre les valeurs de ces propriétés.
 */

export type DossierPhase = "Accompagnement amont" | "Étude recevabilité DDEP" | "Instruction" | "Contrôle" | "Classé sans suite" | "Obligations terminées"

export type DossierProchaineActionAttenduePar = "Instructeur" | "CNPN/CSRPN" | "Pétitionnaire" | "Consultation du public" | "Autre administration" | "Autre" | "Personne";


/**
 * Kanel génère un type `unknown` pour les champs JSON. 
 * 
 * On surcharge ici les propriétés `communes`, `départements` et `régions` pour contraindre le type des valeurs du JSON.
 * 
 */
type DossierDémarcheSimplifiée88444Communes = {
    name: string;
    code: string;
    postalCode: string;
}
  
type DossierLocalisation = {
    communes: DossierDémarcheSimplifiée88444Communes[] | null | undefined;
    départements: string[] | null | undefined;
    régions: string[] | null | undefined;
}

 
type DossierActivitéPrincipale = {
    activité_principale: DossierDemarcheNumerique88444["Activité principale"] | null
} 

type DonnéesDossierPourStats = { décisionsAdministratives: FrontEndDécisionAdministrative[] | undefined}

/**
 * Le type DossierRésumé contient les données nécessaires à afficher le tableau de suivi
 * et pouvoir effectuer des recherches dans le tableau de suivi
 * ou le cartouche résumé commun aux onglets des écrans montrant un unique dossier
 * 
 * Il a pour objectif d'être plutôt facile à requêter en groupe
 */
export type DossierRésumé = Pick<Dossier, 
    'id' | 'number_demarches_simplifiées' | 'nom' | 'date_dépôt' |
    'enjeu_politique' | 'enjeu_écologique' | 'rattaché_au_régime_ae' |
    'prochaine_action_attendue_par' | 'commentaire_libre' |
    'historique_identifiant_demande_onagre'> 
    & {phase: DossierPhase, date_début_phase: Date}
    & DossierLocalisation
    & DossierPersonnesImpliquéesRésumé
    & DossierActivitéPrincipale
    & DonnéesDossierPourStats


export type FrontEndPrescription = Prescription 
    &  { contrôles: Contrôle[] | undefined }


export type FrontEndDécisionAdministrative = Omit<DécisionAdministrative, 'fichier'> 
    & { fichier_url: string | undefined }
    & { prescriptions: FrontEndPrescription[] | undefined }


export type DécisionAdministrativePourTransfer = Partial<Omit<DécisionAdministrative, 'fichier'> 
    & { fichier_base64: {contenuBase64: string, nom: string, media_type: string} }>

export type FrontEndAvisExpert = Omit<AvisExpert, 'avis_fichier' | 'saisine_fichier'> & {
    avis_fichier_url: string | undefined;
    saisine_fichier_url: string | undefined
}


/**
 * Le type DossierComplet contient toutes les informations relatives à un dossier
 * notamment le contenu du fichier espèces impactées s'il y en a un 
 */
export type DossierComplet = Omit<Dossier, 'communes' | 'départements' | 'régions' | 'activité_principale'> &
	DossierLocalisation &
	DossierPersonnesImpliquéesComplet &
	DossierActivitéPrincipale & { espècesImpactées: Pick<Fichier, 'contenu' | 'media_type' | 'nom'> | undefined } & {
		évènementsPhase: ÉvènementPhaseDossier[]
	} & { décisionsAdministratives: FrontEndDécisionAdministrative[] | undefined } & {
		avisExpert: FrontEndAvisExpert[]
	}


export type TypeDécisionAdministrative = "Arrêté dérogation" | "Arrêté refus" | "Arrêté modificatif" | "Courrier" | "Autre décision";


export type RésultatContrôle = "Conforme" | "Non conforme" | "Trop tard" | "En cours" | "Non conforme (Pas d'informations reçues)"
export type TypesActionSuiteContrôle = "Email" | "Courrier" | "Courrier recommandé avec accusé de réception"


// - - - - - Statistiques - - - - - - //
export interface StatsPubliques {
    nbDossiersEnPhaseContrôle: number
    nbDossiersEnPhaseContrôleAvecDécision: number
    nbDossiersEnPhaseContrôleSansDécision: number
    nbPétitionnairesDepuisSept2024: number
    totalDossiers: number
    totalPrescriptions: number
    nbPrescriptionsControlees: number
    statsConformité: StatsConformité
    statsImpactBiodiversité: StatsImpactBiodiversité
}

/**
 * Statistiques des prescriptions par conformité.
 */
export interface StatsConformité {
  /** Le nombre de prescriptions dont le dernier contrôle est Non conforme */
  nb_non_conforme: number;

  /** Le nombre de prescriptions dont le dernier contrôle est Trop tard */
  nb_trop_tard: number;

  /** Le nombre de prescriptions conformes après le 1er contrôle */
  nb_conforme_apres_1: number;

  /** Le nombre de prescriptions conformes après le 2e contrôle */
  nb_conforme_apres_2: number;

  /** Le nombre de prescriptions conformes après le 3e contrôle */
  nb_conforme_apres_3: number;

  /** Le nombre de prescriptions avec retour à la conformité après plus d’un contrôle */
  nb_retour_conformite: number;
}

/**
 * Statistiques d'impact sur la biodiversité des prescriptions conformes.
 */
export interface StatsImpactBiodiversité {
  /** Le nombre total de prescriptions avec au moins un contrôle conforme */
  total_prescriptions_conformes: number;

  /** La somme totale des surfaces évitées (en m² ou ha selon unité) */
  total_surface_évitée: number;

  /** La somme totale des surfaces compensées */
  total_surface_compensée: number;

  /** Le nombre total de nids évités */
  total_nids_évités: number;

  /** Le nombre total de nids compensés */
  total_nids_compensés: number;

  /** Le nombre total d'individus évités */
  total_individus_évités: number;

  /** Le nombre total d'individus compensés */
  total_individus_compensés: number;
}

/**
 * AARRI (indicateurs de suivi).
 */
export interface IndicateursAARRI {
    nombreBaseUtilisateuricePotentielle: number;
    nombreUtilisateuriceAcquis: number;
    nombreUtilisateuriceActif: number;
    nombreUtilisateuriceRetenu: number;
    nombreUtilisateuriceImpact: number;
    date: Date,
}