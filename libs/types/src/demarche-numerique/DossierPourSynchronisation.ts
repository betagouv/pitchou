import type { DossierInitializer, DossierMutator } from "../database/public/Dossier.ts";
import type Personne from "../database/public/Personne.ts";
import type { PersonneInitializer } from "../database/public/Personne.ts";
import type { EntrepriseInitializer } from "../database/public/Entreprise.ts";
import type { EvenementPhaseDossierInitializer as EvenementPhaseDossierInitializer } from "../database/public/EvenementPhaseDossier.ts";
import type { PartialBy } from "../tools";
import type { AvisExpertInitializer } from "../database/public/AvisExpert.ts";
import type { DecisionAdministrativeInitializer as DecisionAdministrativeInitializer } from "../database/public/DecisionAdministrative.ts";

export type DonneesPersonnesEntreprisesInitializer = {
  déposant: PersonneInitializer;
  demandeur_personne_physique: PersonneInitializer | undefined;
  demandeur_personne_morale: EntrepriseInitializer | undefined;
  representative: PersonneInitializer | undefined;
};

type DossierAvecDonneesPersonnesEntreprisesInitializers<T = DossierMutator | DossierInitializer> =
  Omit<
    T,
    "déposant" | "demandeur_personne_physique" | "demandeur_personne_morale" | "representative"
  > &
    DonneesPersonnesEntreprisesInitializer;

/**
 * Représente le format des données issues de Démarche Numérique (DN)
 * avant leur insertion ou mise à jour dans la base de données.
 *
 * Problème technique actuel :
 * - Les données des personnes/entreprises sont récupérées depuis DS,
 *   créées en base, puis réinjectées dans les dossiers à stocker.
 * - Ce couplage complique l’utilisation directe de `DossierMutator` ou `DossierInitializer` pour le type DossierType.
 *
 * TODO :
 * - Suivi de l'issue : @see {@link https://github.com/betagouv/pitchou/issues/312}
 */

export type DossierPourSynchronisation<DossierType> = {
  dossier: DossierType;
  évènement_phase_dossier: PartialBy<EvenementPhaseDossierInitializer, "dossier">[];
  décision_administrative: PartialBy<DecisionAdministrativeInitializer, "dossier">[];
};

export type DossierEntreprisesPersonneInitializersPourInsert = DossierPourSynchronisation<
  DossierAvecDonneesPersonnesEntreprisesInitializers<DossierInitializer>
>;

export type DossierEntreprisesPersonneInitializersPourUpdate = DossierPourSynchronisation<
  DossierAvecDonneesPersonnesEntreprisesInitializers<DossierMutator>
>;

/**
 * A la création de Dossier via un import
 * On peut récupérer la donnée de personnes qui suivent ce dossier.
 * Dans ce cas, on doit impérativement avoir l'email de cette personne.
 */
export type PersonneAvecEmailObligatoire = Partial<Omit<Personne, "email">> & {
  email: NonNullable<Personne["email"]>;
};

//Le type DossierPourInsertGénérique existe pour construire le type des données supplémentaires des dossiers importés
export type DossierPourInsertGenerique<Dossier> = DossierPourSynchronisation<Dossier> & {
  personnes_qui_suivent: PersonneAvecEmailObligatoire[] | undefined;
} & { avis_expert: PartialBy<AvisExpertInitializer, "dossier">[] };
export type DossierPourInsert = DossierPourInsertGenerique<DossierInitializer>;

export type DossierPourUpdate = DossierPourSynchronisation<DossierMutator>;

export type DonneesSupplementairesPourCreationDossier = Partial<
  DossierPourInsertGenerique<Omit<DossierInitializer, "numéro_démarche">>
>;
