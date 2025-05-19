import DossierDatabase from "../database/public/Dossier.ts"
import { PersonneInitializer } from "../database/public/Personne.ts"
import { EntrepriseInitializer } from "../database/public/Entreprise.ts"

import {AnnotationsPriveesDemarcheSimplifiee88444} from '../démarches-simplifiées/DémarcheSimplifiée88444.ts'

export type PropsDécisionHistorique = 'historique_décision' | 'historique_date_signature_arrêté_préfectoral' | 'historique_référence_arrêté_préfectoral' | 'historique_date_signature_arrêté_ministériel' | 'historique_référence_arrêté_ministériel'

export type DossierPourSynchronisation = Omit<DossierDatabase, PropsDécisionHistorique | "id" | "déposant" | "demandeur_personne_physique" | "demandeur_personne_morale" | "phase" | "prochaine_action_attendue_par"> & {
    déposant: PersonneInitializer,
    demandeur_personne_physique: PersonneInitializer | undefined,
    demandeur_personne_morale: EntrepriseInitializer | undefined,
}

export type DécisionAdministrativeAnnotation88444 = {
    décision: AnnotationsPriveesDemarcheSimplifiee88444['Décision'] | undefined,
    date_signature_arrêté_préfectoral: AnnotationsPriveesDemarcheSimplifiee88444[`Date de signature de l'AP`] | undefined,
    référence_arrêté_préfectoral: AnnotationsPriveesDemarcheSimplifiee88444[`Référence de l'AP`] | undefined,
    date_signature_arrêté_ministériel: AnnotationsPriveesDemarcheSimplifiee88444[`Date de l'AM`] | undefined,
    référence_arrêté_ministériel: AnnotationsPriveesDemarcheSimplifiee88444[`Référence de l'AM`] | undefined
}