import Dossier from './database/public/Dossier.ts'
import { DossierDemarcheSimplifiee88444 } from './démarches-simplifiées/DémarcheSimplifiée88444.ts'
import Fichier from './database/public/Fichier.ts'
import ÉvènementPhaseDossier from './database/public/ÉvènementPhaseDossier.ts'
import DécisionAdministrative from './database/public/DécisionAdministrative.ts'
import Prescription from './database/public/Prescription.ts'


type DossierPersonnesImpliquées = {
    déposant_nom: string;
    déposant_prénoms: string;
    demandeur_personne_physique_nom: string;
    demandeur_personne_physique_prénoms: string;
    demandeur_personne_morale_raison_sociale: string;
    demandeur_personne_morale_siret: string;
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
    activité_principale: DossierDemarcheSimplifiee88444["Activité principale"] | null
} 

type DonnéesDossierPourStats = Pick<Dossier, 'historique_date_réception_ddep'> & { décisionsAdministratives: FrontEndDécisionAdministrative[] | undefined}

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
    'prochaine_action_attendue_par' | 'commentaire_enjeu' |
    'historique_identifiant_demande_onagre'> 
    & {phase: DossierPhase, date_début_phase: Date}
    & DossierLocalisation
    & DossierPersonnesImpliquées
    & DossierActivitéPrincipale
    & DonnéesDossierPourStats


export type FrontEndDécisionAdministrative = Omit<DécisionAdministrative, 'fichier'> 
    & {fichier_url: string | undefined}
    & {
        prescriptions: Prescription[] | undefined
    }

/**
 * Le type DossierComplet contient toutes les informations relatives à un dossier
 * notamment le contenu du fichier espèces impactées s'il y en a un 
 */
export type DossierComplet = Omit<Dossier, 
    'communes' | 'départements' | 'régions' | 'activité_principale'>
    & DossierLocalisation
    & DossierPersonnesImpliquées
    & DossierActivitéPrincipale
    & { espècesImpactées: Pick<Fichier, 'contenu' | 'media_type' | 'nom'> | undefined }
    & { évènementsPhase: ÉvènementPhaseDossier[] }
    & { décisionsAdministratives: FrontEndDécisionAdministrative[] | undefined}


export type TypeDécisionAdministrative = "Arrêté dérogation" | "Arrêté refus" | "Arrêté modificatif" | "Courrier" | "Autre décision";


export type RésultatContrôle = "Conforme" | "Non conforme" | "Trop tard" | "En cours" | "Non conforme (Pas d'informations reçues)"
export type TypesActionSuiteContrôle = "Email" | "Courrier" | "Courrier recommandé avec accusé de réception"

