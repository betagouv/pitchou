import { DossierPhase, DossierProchaineActionAttenduePar } from "./API_Pitchou"
import Dossier from "./database/public/Dossier"

export type ÉvènementRechercheDossiersDétails =  {
    filtres: {
        suiviPar?: {
            nombreSéléctionnées: number,
            nombreTotal: number,
            inclusSoiMême: boolean,
        },
        sansInstructeurice?: boolean,
        texte?: string,
        phases?: DossierPhase[],
        prochaineActionAttenduePar?: Array<DossierProchaineActionAttenduePar | "(vide)">,
        activitésPrincipales?: NonNullable<Dossier['activité_principale']>[]
    },
    nombreRésultats: number
}

export type ÉvènementMétrique = {
    // Cliquer sur un lien de connexion
    type: 'seConnecter'
} | {
    // Appuyer sur un bouton pour suivre un dossier
    type: 'suivreUnDossier',
    détails: {
        dossierId: number
    }
}

// Événéments de modification
// Modifier le commentaire d'instruction
| { type: 'modifierCommentaireInstruction'}


// Événements de consultation
// Utiliser la fonctionnalité de recherche et de filtre dans la liste des dossiers
| { type: 'rechercherDesDossiers', détails: ÉvènementRechercheDossiersDétails }

// Afficher la liste des dossiers que l’utilisataire suit
| { type: 'afficherLesDossiersSuivis' }

// Accèder à l’onglet “Projet” d’un dossier
| { type: 'consulterUnDossier', détails: { dossierId: number } }

// Télécharger la liste des éspèces impactées d’un dossier
| { type: 'téléchargerListeÉspècesImpactées', détails: { dossierId: number } }
