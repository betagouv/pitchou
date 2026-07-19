import type { DossierInitializer, DossierMutator } from "../database/public/Dossier.ts";
import type Personne from "../database/public/Personne.ts";
import type { PersonneInitializer } from "../database/public/Personne.ts";
import type { EntrepriseInitializer } from "../database/public/Entreprise.ts";
import type { EvenementPhaseDossierInitializer } from "../database/public/EvenementPhaseDossier.ts";
import type { PartialBy } from "../tools";
import type { AvisExpertInitializer } from "../database/public/AvisExpert.ts";
import type { DecisionAdministrativeInitializer } from "../database/public/DecisionAdministrative.ts";
import type { IdentiteDossierInitializer } from "../database/public/IdentiteDossier.ts";

/** Identity snapshot extracted from Démarche Numérique, before the dossier id is known. */
export type IdentiteDossierData = Omit<IdentiteDossierInitializer, "id" | "dossier">;

export type PersonnesEntreprisesDataInitializer = {
  deposant: PersonneInitializer;
  demandeur_personne_physique: PersonneInitializer | undefined;
  demandeur_personne_morale: EntrepriseInitializer | undefined;
  identites: IdentiteDossierData[];
};

type DossierWithPersonnesEntreprisesDataInitializers<T = DossierMutator | DossierInitializer> = Omit<
  T,
  "deposant" | "demandeur_personne_physique" | "demandeur_personne_morale" | "representative"
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
  evenement_phase_dossier: PartialBy<EvenementPhaseDossierInitializer, "dossier">[];
  decision_administrative: PartialBy<DecisionAdministrativeInitializer, "dossier">[];
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
  followers: PersonneWithRequiredEmail[] | undefined;
} & { avis_expert: PartialBy<AvisExpertInitializer, "dossier">[] };
export type DossierForInsert = DossierForInsertGeneric<DossierInitializer>;

export type DossierForUpdate = DossierForSynchronization<DossierMutator>;

type RenameKeys<T, Names extends Partial<Record<keyof T, PropertyKey>>> = {
  [Key in keyof T as Key extends keyof Names
    ? Names[Key] extends PropertyKey
      ? Names[Key]
      : never
    : Key]: T[Key];
};

type LegacyDossierInitializer = RenameKeys<
  DossierInitializer,
  {
    demarche_numerique_id: "id_demarches_simplifiées";
    depot_date: "date_dépôt";
    departments: "départements";
    deposant: "déposant";
    regions: "régions";
    name: "nom";
    demarche_numerique_number: "number_demarches_simplifiées";
    ddep_required: "ddep_nécessaire";
    free_comment: "commentaire_libre";
    onagre_demande_identifier: "historique_identifiant_demande_onagre";
    public_consultation_start_date: "date_debut_consultation_public";
    linked_to_ae_regime: "rattaché_au_régime_ae";
    next_action_expected_from: "prochaine_action_attendue_par";
    main_activite: "activité_principale";
    especes_impactees: "espèces_impactées";
    intervention_start_date: "date_début_intervention";
    intervention_end_date: "date_fin_intervention";
    intervention_duration: "durée_intervention";
    scientifique_demande_type: "scientifique_type_demande";
    scientifique_suivi_protocol_description: "scientifique_description_protocole_suivi";
    scientifique_capture_mode: "scientifique_mode_capture";
    scientifique_light_source_conditions: "scientifique_modalités_source_lumineuses";
    scientifique_marking_conditions: "scientifique_modalités_marquage";
    scientifique_transport_conditions: "scientifique_modalités_transport";
    scientifique_intervention_perimeter: "scientifique_périmètre_intervention";
    scientifique_other_intervenants_details: "scientifique_précisions_autres_intervenants";
    no_other_satisfactory_solution_justification: "justification_absence_autre_solution_satisfaisante";
    motif_derogation: "motif_dérogation";
    motif_derogation_justification: "justification_motif_dérogation";
    mesures_erc_planned: "mesures_erc_prévues";
    scientifique_previous_assessment: "scientifique_bilan_antérieur";
    scientifique_demande_purposes: "scientifique_finalité_demande";
    dossier_oiseau_simple_destroyed_nids_count: "nombre_nids_détruits_dossier_oiseau_simple";
    dossier_oiseau_simple_compensated_nids_count: "nombre_nids_compensés_dossier_oiseau_simple";
    demarche_number: "numéro_démarche";
    ecological_inventory_completed: "etat_des_lieux_ecologique_complet_realise";
    especes_present_in_influence_area: "presence_especes_dans_aire_influence";
    risk_despite_erc_mesures: "risque_malgre_mesures_erc";
    public_consultation_end_date: "date_fin_consultation_public";
    er_mesures_sufficient: "mesures_er_suffisantes";
    commissioning_date: "date_mise_en_service";
    projet_map: "cartographie_projet";
  }
>;

type LegacyPersonneInitializer = RenameKeys<
  PersonneInitializer,
  {
    last_name: "nom";
    first_names: "prénoms";
    access_code: "code_accès";
  }
>;

type LegacyEvenementPhaseDossierInitializer = RenameKeys<
  EvenementPhaseDossierInitializer,
  {
    timestamp: "horodatage";
    caused_by_personne: "cause_personne";
    demarche_numerique_agent_email: "DS_emailAgentTraitant";
    demarche_numerique_motivation: "DS_motivation";
  }
>;

type LegacyDecisionAdministrativeInitializer = RenameKeys<
  DecisionAdministrativeInitializer,
  {
    number: "numéro";
    signature_date: "date_signature";
    obligations_end_date: "date_fin_obligations";
  }
>;

type LegacyAvisExpertInitializer = RenameKeys<
  AvisExpertInitializer,
  {
    saisine_date: "date_saisine";
    avis_date: "date_avis";
  }
>;

type LegacyAdditionalDataForDossierCreation = Partial<{
  dossier: Omit<LegacyDossierInitializer, "numéro_démarche">;
  évènement_phase_dossier: PartialBy<LegacyEvenementPhaseDossierInitializer, "dossier">[];
  décision_administrative: PartialBy<LegacyDecisionAdministrativeInitializer, "dossier">[];
  personnes_qui_suivent:
    | (Partial<Omit<LegacyPersonneInitializer, "email">> & {
        email: NonNullable<Personne["email"]>;
      })[]
    | undefined;
  avis_expert: PartialBy<LegacyAvisExpertInitializer, "dossier">[];
}>;

type CurrentAdditionalDataForDossierCreation = Partial<{
  dossier: Omit<DossierInitializer, "demarche_number">;
  evenement_phase_dossier: PartialBy<EvenementPhaseDossierInitializer, "dossier">[];
  decision_administrative: PartialBy<DecisionAdministrativeInitializer, "dossier">[];
  followers: PersonneWithRequiredEmail[] | undefined;
  avis_expert: PartialBy<AvisExpertInitializer, "dossier">[];
}>;

/** Persisted encrypted import payload. Both historical and current keys must remain readable. */
export type AdditionalDataForDossierCreation =
  | LegacyAdditionalDataForDossierCreation
  | CurrentAdditionalDataForDossierCreation;
