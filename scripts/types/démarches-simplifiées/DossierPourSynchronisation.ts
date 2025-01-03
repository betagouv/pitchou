import Dossier from "../database/public/Dossier.ts"
import { PersonneInitializer } from "../database/public/Personne.ts"
import { EntrepriseInitializer } from "../database/public/Entreprise.ts"

export type DossierPourSynchronisation = Omit<Dossier, "id" | "déposant" |  "demandeur_personne_physique" | "demandeur_personne_morale" | "phase" | "prochaine_action_attendue_par"> & {
    déposant: PersonneInitializer,
    demandeur_personne_physique: PersonneInitializer | undefined,
    demandeur_personne_morale: EntrepriseInitializer | undefined
}
