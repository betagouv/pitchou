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
    // On considère qu'une connexion correspond au chargement de Pitchou et la récupération réussie des URLs de caps
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
// Changer la phase d'un dossier
| { type: 'changerPhase'}
// Changer prochaine prochaine action attendue de
| { type: 'changerProchaineActionAttendueDe'}
// Ajouter une décision administrative
| { type: 'ajouterDécisionAdministrative'}
// Modifier une décision administrative
| { type: 'modifierDécisionAdministrative'}
// Supprimer une décision administrative
| { type: 'supprimerDécisionAdministrative'}
// Ajouter une prescription
| { type: 'ajouterPrescription'}
// Modifier une prescription
| { type: 'modifierPrescription'}
// Supprimer une prescription
| { type: 'supprimerPrescription'}
// Ajouter un contrôle
| { type: 'ajouterContrôle'}
// Modifier un contrôle
| { type: 'modifierContrôle'}
// Supprimer un contrôle
| { type: 'supprimerContrôle'}


// Événements de consultation
// Utiliser la fonctionnalité de recherche et de filtre dans la liste des dossiers
| { type: 'rechercherDesDossiers', détails: ÉvènementRechercheDossiersDétails }
// Afficher la liste des dossiers que l’utilisataire suit
| { type: 'afficherLesDossiersSuivis' }
// Accèder à l’onglet “Projet” d’un dossier
| { type: 'consulterUnDossier', détails: { dossierId: number } }
// Télécharger la liste des éspèces impactées d’un dossier
| { type: 'téléchargerListeÉspècesImpactées', détails: { dossierId: number } }