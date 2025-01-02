import Dossier from './database/public/Dossier.ts'

/**
 * Ce fichier décrit les types de données retournés par l'API Pitchou
 * 
 */


export interface DossierRésumé extends Dossier{

}


interface DossierComplémentPersonnesImpliquées {
    nom_dossier: string;
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

type DossierPhase = "Accompagnement amont" | "Vérification du dossier" | "Instruction" | "Contrôle" | "Classé sans suite" | "Obligations terminées"

type DossierProchaineActionAttenduePar = "Instructeur" | "CNPN/CSRPN" | "Pétitionnaire" | "Consultation du public" | "Autre administration" | "Autre" | "Personne";

interface DossierPhaseEtProchaineAction {
    phase: DossierPhase;
    prochaine_action_attendue_par: DossierProchaineActionAttenduePar;
}

/**
 * Kanel génère un type `unknown` pour les champs JSON. 
 * 
 * On surcharge ici les propriétés `communes`, `départements` et `régions` pour contraindre le type des valeurs du JSON.
 * 
 */

interface DossierDémarcheSimplifiée88444Communes {
    name: string;
    code: string;
    postalCode: string;
}
  
interface DossierLocalisation {
    communes: DossierDémarcheSimplifiée88444Communes[];
    départements: string[] | null | undefined;
    régions: string[] | null | undefined;
}

interface DossierFicherEspècesProtégées{
    url_fichier_espèces_impactées?: string
}



export interface DossierComplet extends 
    Omit<Dossier, 'communes' | 'départements' | 'régions'>, 
    DossierPhaseEtProchaineAction, 
    DossierLocalisation, 
    DossierComplémentPersonnesImpliquées,
    DossierFicherEspècesProtégées {
        // rien d'autre
}