import Dossier from "../database/public/Dossier.ts"
import Personne from "../database/public/Personne.ts"
import Entreprise from "../database/public/Entreprise.ts"

export type DossierPourSynchronisation = Omit<
    Dossier, 
    "déposant" | "demandeur_personne_physique" | "demandeur_personne_morale"
> & {
    déposant: Personne,
    demandeur_personne_physique: Personne,
    demandeur_personne_morale: Entreprise
}
