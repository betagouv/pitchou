import { DossierInitializer, DossierMutator } from "../database/public/Dossier.ts"
import { PersonneInitializer } from "../database/public/Personne.ts"
import { EntrepriseInitializer } from "../database/public/Entreprise.ts"

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
 * - Résoudre cette dépendance afin d'utiliser directement `DossierMutator` ou 
 *   `DossierInitializer` sans wrapper spécifique.
 * - Suivi due l'issue : @see {@link https://github.com/betagouv/pitchou/issues/312}
 */
export type DossierPourSynchronisation<
    T = DossierMutator | DossierInitializer
> = Omit<T, "déposant" | "demandeur_personne_physique" | "demandeur_personne_morale">
    & DonnéesPersonnesEntreprises;

export type DonnéesPersonnesEntreprises = {
    déposant: PersonneInitializer,
    demandeur_personne_physique: PersonneInitializer | undefined,
    demandeur_personne_morale: EntrepriseInitializer | undefined,
}