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
// Changer la phase d'un dossier
| { type: 'changerPhase'}
// Changer prochaine prochaine action attendue de
| { type: 'changerProchaineActionAttendueDe'}


// Événements de consultation
// Rechercher des dossiers
| { type: 'rechercherDesDossiers' }


