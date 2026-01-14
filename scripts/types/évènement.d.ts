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
| { type: 'rechercherDesDossiers' }

// Afficher la liste des dossiers que l’utilisataire suit
| { type: 'afficherLesDossiersSuivis' }
