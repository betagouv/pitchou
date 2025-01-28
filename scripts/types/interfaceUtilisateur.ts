import { DossierPhase, DossierProchaineActionAttenduePar } from "./API_Pitchou"
import Personne from "./database/public/Personne"

export type TriTableauSuiviDDEP = {
    id: string // identifiant sérialisable pour identifier le tri sélectionné dans le localStorage
    nom: string // nom d'affichage dans l'interface utilisateur
    trier: () => void
}

export type FiltresLocalStorage = {
    phases: DossierPhase[]
    'prochaine action attendue de': DossierProchaineActionAttenduePar[]
    instructeurs: NonNullable<Personne['email']>
}