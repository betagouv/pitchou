import { DossierPhase, DossierProchaineActionAttenduePar } from "./API_Pitchou"

export type TriTableauSuiviDDEP = {
    id: string // identifiant sérialisable pour identifier le tri sélectionné dans le localStorage
    nom: string // nom d'affichage dans l'interface utilisateur
    trier: () => void
}

export type FiltresLocalStorage = {
    phases: DossierPhase[]
    'prochaine action attendue de': DossierProchaineActionAttenduePar[]
}