export type ÉvènementMétrique = {
    // Cliquer sur un lien de connexion
    type: 'seConnecter',
    détails: undefined
} | {
    // Appuyer sur un bouton pour suivre un dossier
    type: 'suivreUnDossier',
    détails: {
        dossierId: number
    }
};
