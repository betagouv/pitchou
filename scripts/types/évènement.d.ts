export type ÉvènementMétrique = {
    type: 'seConnecter',
    détails: undefined
} | {
    type: 'suivreUnDossier',
    détails: {
        dossierId: number
    }
};
