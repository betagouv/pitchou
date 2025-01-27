export type TriTableauSuiviDDEP = {
    id: string // identifiant sérialisable pour identifier le tri sélectionné dans le localStorage
    nom: string // nom d'affichage dans l'interface utilisateur
    trier: () => void
}