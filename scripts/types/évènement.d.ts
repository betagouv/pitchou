export type ÉvènementMétrique = {
    // Cliquer sur un lien de connexion
    type: 'seConnecter'
} | {
    // Appuyer sur un bouton pour suivre un dossier
    type: 'suivreUnDossier',
    détails: {
        dossierId: number
    }
} | {
    type: 'rechercherDesDossiers'
};
