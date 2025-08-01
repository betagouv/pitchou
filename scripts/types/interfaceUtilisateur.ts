import { DossierPhase, DossierProchaineActionAttenduePar } from "./API_Pitchou"
import Dossier from "./database/public/Dossier"
import Personne from "./database/public/Personne"

export type TriTableau = {
    id: string // identifiant sérialisable pour identifier le tri sélectionné dans le localStorage
    nom: string // nom d'affichage dans l'interface utilisateur
    trier: () => void
}

export type FiltresLocalStorage = {
    phases: DossierPhase[]
    'prochaine action attendue de': DossierProchaineActionAttenduePar[]
    instructeurs: NonNullable<Personne['email']>[]
    activitésPrincipales: NonNullable<Dossier['activité_principale']>[]
}

export type TriLocalStorage = TriTableau['id']

export type TriFiltreLocalStorage = Partial<{
    tri: TriLocalStorage
    filtres: Partial<FiltresLocalStorage>
}>