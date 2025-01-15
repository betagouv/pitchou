import Dossier from './database/public/Dossier.ts'
import { DossierDemarcheSimplifiee88444 } from './démarches-simplifiées/DémarcheSimplifiée88444.ts'
import EspècesImpactées from './database/public/EspècesImpactées.ts'
import ÉvènementPhaseDossier from './database/public/ÉvènementPhaseDossier.ts'


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

type DossierPhaseEtProchaineAction = {
    phase: DossierPhase;
    prochaine_action_attendue_par: DossierProchaineActionAttenduePar;
}

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
    communes: DossierDémarcheSimplifiée88444Communes[];
    départements: string[] | null | undefined;
    régions: string[] | null | undefined;
}

 
type DossierActivitéPrincipale = {
    activité_principale: DossierDemarcheSimplifiee88444["Activité principale"] | null
} 

type DonnéesDossierPourStats = Pick<Dossier, 
    'historique_date_réception_ddep' | 'date_dépôt' |
    'historique_date_signature_arrêté_préfectoral'>

/**
 * Le type DossierRésumé contient les données nécessaires à afficher le tableau de suivi
 * et pouvoir effectuer des recherches dans le tableau de suivi
 * ou le cartouche résumé commun aux onglets des écrans montrant un unique dossier
 * 
 * Il a pour objectif d'être plutôt facile à requêter en groupe
 */
export type DossierRésumé = Pick<Dossier, 
    'id' | 'number_demarches_simplifiées' | 'nom' |
    'enjeu_politique' | 'enjeu_écologique' | 'rattaché_au_régime_ae' |
    'historique_identifiant_demande_onagre'> 
    & DossierLocalisation
    & DossierPersonnesImpliquées
    & DossierPhaseEtProchaineAction
    & DossierActivitéPrincipale
    & DonnéesDossierPourStats


/**
 * Le type DossierComplet contient toutes les informations relatives à un dossier
 * notamment le contenu du fichier espèces impactées s'il y en a un 
 */

export type DossierComplet = 
    Omit<Dossier, 'communes' | 'départements' | 'régions' | 'activité_principale'>
    & DossierLocalisation
    & DossierPhaseEtProchaineAction
    & DossierPersonnesImpliquées
    & DossierActivitéPrincipale
    & { espècesImpactées: EspècesImpactées | undefined }
    & { évènementsPhase: ÉvènementPhaseDossier[] }
