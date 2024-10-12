import Dossier from "../database/public/Dossier.ts"
import Personne, { PersonneInitializer } from "../database/public/Personne.ts"
import Entreprise, { EntrepriseInitializer } from "../database/public/Entreprise.ts"

export type DossierPourSynchronisation = Omit<Dossier, "id" | "déposant" |  "demandeur_personne_physique" | "demandeur_personne_morale" | "phase" | "prochaine_action_attendue" | "prochaine_action_attendue_par"> & {
    déposant: PersonneInitializer,
    demandeur_personne_physique: PersonneInitializer | undefined,
    demandeur_personne_morale: EntrepriseInitializer | undefined
}
