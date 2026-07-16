import type { DossierInitializer, DossierMutator } from "../database/public/Dossier.ts";
import type Personne from "../database/public/Personne.ts";
import type { PersonneInitializer } from "../database/public/Personne.ts";
import type { EntrepriseInitializer } from "../database/public/Entreprise.ts";
import type { EvenementPhaseDossierInitializer as EvenementPhaseDossierInitializer } from "../database/public/EvenementPhaseDossier.ts";
import type { PartialBy } from "../tools";
import type { AvisExpertInitializer } from "../database/public/AvisExpert.ts";
import type { DecisionAdministrativeInitializer as DecisionAdministrativeInitializer } from "../database/public/DecisionAdministrative.ts";

export type PersonnesEntreprisesDataInitializer = {
  déposant: PersonneInitializer;
  demandeur_personne_physique: PersonneInitializer | undefined;
  demandeur_personne_morale: EntrepriseInitializer | undefined;
  representative: PersonneInitializer | undefined;
};

type DossierWithPersonnesEntreprisesDataInitializers<T = DossierMutator | DossierInitializer> = Omit<
  T,
  "déposant" | "demandeur_personne_physique" | "demandeur_personne_morale" | "representative"
> &
  PersonnesEntreprisesDataInitializer;

/**
 * Represents the format of the data coming from Démarche Numérique (DN)
 * before its insertion or update in the database.
 *
 * Current technical problem:
 * - The personnes/entreprises data is fetched from DS,
 *   created in the database, then reinjected into the dossiers to store.
 * - This coupling makes it hard to directly use `DossierMutator` or `DossierInitializer` for the DossierType type.
 *
 * TODO:
 * - Issue tracking: @see {@link https://github.com/betagouv/pitchou/issues/312}
 */

export type DossierForSynchronization<DossierType> = {
  dossier: DossierType;
  évènement_phase_dossier: PartialBy<EvenementPhaseDossierInitializer, "dossier">[];
  décision_administrative: PartialBy<DecisionAdministrativeInitializer, "dossier">[];
};

export type DossierEntreprisesPersonneInitializersForInsert = DossierForSynchronization<
  DossierWithPersonnesEntreprisesDataInitializers<DossierInitializer>
>;

export type DossierEntreprisesPersonneInitializersForUpdate = DossierForSynchronization<
  DossierWithPersonnesEntreprisesDataInitializers<DossierMutator>
>;

/**
 * When creating a Dossier via an import,
 * we can retrieve the data of the personnes following this dossier.
 * In that case, we must necessarily have that personne's email.
 */
export type PersonneWithRequiredEmail = Partial<Omit<Personne, "email">> & {
  email: NonNullable<Personne["email"]>;
};

// The DossierForInsertGeneric type exists to build the type of the additional data of imported dossiers
export type DossierForInsertGeneric<Dossier> = DossierForSynchronization<Dossier> & {
  personnes_qui_suivent: PersonneWithRequiredEmail[] | undefined;
} & { avis_expert: PartialBy<AvisExpertInitializer, "dossier">[] };
export type DossierForInsert = DossierForInsertGeneric<DossierInitializer>;

export type DossierForUpdate = DossierForSynchronization<DossierMutator>;

export type AdditionalDataForDossierCreation = Partial<
  DossierForInsertGeneric<Omit<DossierInitializer, "numéro_démarche">>
>;
