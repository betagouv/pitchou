import { DossierInitializer, DossierMutator } from "../database/public/Dossier.ts"
import { PersonneInitializer } from "../database/public/Personne.ts"
import { EntrepriseInitializer } from "../database/public/Entreprise.ts"

import {AnnotationsPriveesDemarcheSimplifiee88444} from '../démarches-simplifiées/DémarcheSimplifiée88444.ts'

// les colonnes en type de base de données 'json' sont insérés sous forme de string après un JSON.stringify
type JSONTypeProps = 'scientifique_type_demande' | 'scientifique_mode_capture' | 'scientifique_modalités_source_lumineuses'

export type DossierPourSynchronisation<T = DossierMutator | DossierInitializer> = Omit<T, JSONTypeProps | "id" | "déposant" | "demandeur_personne_physique" | "demandeur_personne_morale" | "phase" | "prochaine_action_attendue_par"> & {
    déposant: PersonneInitializer,
    demandeur_personne_physique: PersonneInitializer | undefined,
    demandeur_personne_morale: EntrepriseInitializer | undefined,
} & {
   [key in JSONTypeProps] : string | undefined
}

export type DécisionAdministrativeAnnotation88444 = {
    décision: AnnotationsPriveesDemarcheSimplifiee88444['Décision'] | undefined,
    date_signature_arrêté_préfectoral: AnnotationsPriveesDemarcheSimplifiee88444[`Date de signature de l'AP`] | undefined,
    référence_arrêté_préfectoral: AnnotationsPriveesDemarcheSimplifiee88444[`Référence de l'AP`] | undefined,
    date_signature_arrêté_ministériel: AnnotationsPriveesDemarcheSimplifiee88444[`Date de l'AM`] | undefined,
    référence_arrêté_ministériel: AnnotationsPriveesDemarcheSimplifiee88444[`Référence de l'AM`] | undefined
}