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


// Événements de consultation
// Rechercher des dossiers
| { type: 'rechercherDesDossiers' }
