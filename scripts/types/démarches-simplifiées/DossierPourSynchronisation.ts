import { DossierInitializer, DossierMutator } from "../database/public/Dossier.ts"
import { PersonneInitializer } from "../database/public/Personne.ts"
import { EntrepriseInitializer } from "../database/public/Entreprise.ts"
import { VNementPhaseDossierInitializer as ÉvènementPhaseDossierInitializer } from "../database/public/ÉvènementPhaseDossier.ts"
import { PartialBy } from "../tools"


export type DonnéesPersonnesEntreprisesInitializer = {
    déposant: PersonneInitializer,
    demandeur_personne_physique: PersonneInitializer | undefined,
    demandeur_personne_morale: EntrepriseInitializer | undefined,
}

type DossierAvecDonnéesPersonnesEntreprisesInitializers<T = DossierMutator | DossierInitializer> = 
    Omit<T, "déposant" | "demandeur_personne_physique" | "demandeur_personne_morale">
        & DonnéesPersonnesEntreprisesInitializer

/**
 * Représente le format des données issues de Démarches Simplifiées (DS) 
 * avant leur insertion ou mise à jour dans la base de données.
 * 
 * Contexte :
 * - Ce type est une version enrichie de `DossierMutator` (pour modification) 
 *   ou `DossierInitializer` (pour création).
 * - Les champs relatifs aux personnes/entreprises (`déposant`, 
 *   `demandeur_personne_physique`, `demandeur_personne_morale`) sont remplacés 
 *   par `DonnéesPersonnesEntreprises` afin de traiter séparément la création 
 *   et la réutilisation de ces entités.
 * 
 * Problème technique actuel :
 * - Les données des personnes/entreprises sont récupérées depuis DS,
 *   créées en base, puis réinjectées dans les dossiers à stocker.
 * - Ce couplage complique l’utilisation directe de `DossierMutator` ou `DossierInitializer`.
 * 
 * TODO :
 * - Suivi due l'issue : @see {@link https://github.com/betagouv/pitchou/issues/312}
 */

export type DossierPourSynchronisation<DossierType> = {
    dossier: DossierType
    évènement_phase_dossier: PartialBy<ÉvènementPhaseDossierInitializer, 'dossier'>[]
}

export type DossierEntreprisesPersonneInitializersPourInsert = 
    DossierPourSynchronisation<DossierAvecDonnéesPersonnesEntreprisesInitializers<DossierInitializer>>

export type DossierEntreprisesPersonneInitializersPourUpdate = 
    DossierPourSynchronisation<DossierAvecDonnéesPersonnesEntreprisesInitializers<DossierMutator>>
    
export type DossierPourInsert = DossierPourSynchronisation<DossierInitializer>

export type DossierPourUpdate = DossierPourSynchronisation<DossierMutator>


