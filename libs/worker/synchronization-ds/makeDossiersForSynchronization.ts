import assert from "node:assert/strict";
import { decryptDossiersAdditionalData } from "@pitchou/server/demarche-numerique/encryptDecryptDossiersAdditionalData.ts";
import { isAfter } from "date-fns";
import { normalizeEmail } from "@pitchou/common/stringManipulation.ts";
import { inseeHeadcountRangeLabel } from "./inseeHeadcountRange.ts";

import type {
  AdditionalDataForDossierCreation,
  DossierEntreprisesPersonneInitializersForInsert,
  DossierEntreprisesPersonneInitializersForUpdate,
  DossierForInsert,
  IdentiteDossierData,
  PersonnesEntreprisesDataInitializer,
  PersonneWithRequiredEmail,
} from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type { ChampDescriptor } from "@pitchou/types/demarche-numerique/schema.ts";
import type {
  DossierDS88444,
  Traitement,
  DemarchesSimplifeesAddress,
} from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type {
  default as DecisionAdministrative,
  DecisionAdministrativeInitializer,
} from "@pitchou/types/database/public/DecisionAdministrative.ts";
import type { PartialBy } from "@pitchou/types/tools.d.ts";
import type { TypeDecisionAdministrative, DossierPhase } from "@pitchou/types/API_Pitchou.ts";
import type { DossierInitializer, DossierMutator } from "@pitchou/types/database/public/Dossier.ts";
import type { EvenementPhaseDossierInitializer } from "@pitchou/types/database/public/EvenementPhaseDossier.ts";
import type { AvisExpertInitializer } from "@pitchou/types/database/public/AvisExpert.ts";

const persistedDossierColumnRenames = {
  id_demarches_simplifiées: "demarche_numerique_id",
  date_dépôt: "depot_date",
  départements: "departments",
  déposant: "deposant",
  régions: "regions",
  nom: "name",
  number_demarches_simplifiées: "demarche_numerique_number",
  ddep_nécessaire: "ddep_required",
  commentaire_libre: "free_comment",
  historique_identifiant_demande_onagre: "onagre_demande_identifier",
  date_debut_consultation_public: "public_consultation_start_date",
  rattaché_au_régime_ae: "linked_to_ae_regime",
  prochaine_action_attendue_par: "next_action_expected_from",
  activité_principale: "main_activite",
  espèces_impactées: "especes_impactees",
  date_début_intervention: "intervention_start_date",
  date_fin_intervention: "intervention_end_date",
  durée_intervention: "intervention_duration",
  scientifique_type_demande: "scientifique_demande_type",
  scientifique_description_protocole_suivi: "scientifique_suivi_protocol_description",
  scientifique_mode_capture: "scientifique_capture_mode",
  scientifique_modalités_source_lumineuses: "scientifique_light_source_conditions",
  scientifique_modalités_marquage: "scientifique_marking_conditions",
  scientifique_modalités_transport: "scientifique_transport_conditions",
  scientifique_périmètre_intervention: "scientifique_intervention_perimeter",
  scientifique_précisions_autres_intervenants: "scientifique_other_intervenants_details",
  justification_absence_autre_solution_satisfaisante:
    "no_other_satisfactory_solution_justification",
  motif_dérogation: "motif_derogation",
  justification_motif_dérogation: "motif_derogation_justification",
  mesures_erc_prévues: "mesures_erc_planned",
  scientifique_bilan_antérieur: "scientifique_previous_assessment",
  scientifique_finalité_demande: "scientifique_demande_purposes",
  nombre_nids_détruits_dossier_oiseau_simple: "dossier_oiseau_simple_destroyed_nids_count",
  nombre_nids_compensés_dossier_oiseau_simple: "dossier_oiseau_simple_compensated_nids_count",
  numéro_démarche: "demarche_number",
  etat_des_lieux_ecologique_complet_realise: "ecological_inventory_completed",
  presence_especes_dans_aire_influence: "especes_present_in_influence_area",
  risque_malgre_mesures_erc: "risk_despite_erc_mesures",
  date_fin_consultation_public: "public_consultation_end_date",
  mesures_er_suffisantes: "er_mesures_sufficient",
  date_mise_en_service: "commissioning_date",
  cartographie_projet: "projet_map",
} as const;

function renamePersistedProperties(
  value: unknown,
  renames: Readonly<Record<string, string>>,
): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  return Object.fromEntries(
    Object.entries(value).map(([key, propertyValue]) => [renames[key] ?? key, propertyValue]),
  );
}

function renamePersistedArrayProperties(
  value: unknown,
  renames: Readonly<Record<string, string>>,
): Record<string, unknown>[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => renamePersistedProperties(item, renames) ?? {});
}

function mapPersistedAdditionalData(
  value: AdditionalDataForDossierCreation,
): Partial<DossierForInsert> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const persisted = value as unknown as Record<string, unknown>;

  return {
    dossier: renamePersistedProperties(
      persisted.dossier,
      persistedDossierColumnRenames,
    ) as unknown as DossierInitializer,
    evenement_phase_dossier: renamePersistedArrayProperties(persisted["évènement_phase_dossier"], {
      horodatage: "timestamp",
      cause_personne: "caused_by_personne",
      DS_emailAgentTraitant: "demarche_numerique_agent_email",
      DS_motivation: "demarche_numerique_motivation",
    }) as PartialBy<EvenementPhaseDossierInitializer, "dossier">[] | undefined,
    decision_administrative: renamePersistedArrayProperties(persisted["décision_administrative"], {
      numéro: "number",
      date_signature: "signature_date",
      date_fin_obligations: "obligations_end_date",
    }) as PartialBy<DecisionAdministrativeInitializer, "dossier">[] | undefined,
    avis_expert: renamePersistedArrayProperties(persisted.avis_expert, {
      date_saisine: "saisine_date",
      date_avis: "avis_date",
    }) as PartialBy<AvisExpertInitializer, "dossier">[] | undefined,
    followers: renamePersistedArrayProperties(persisted.personnes_qui_suivent, {
      nom: "last_name",
      prénoms: "first_names",
      code_accès: "access_code",
    }) as PersonneWithRequiredEmail[] | undefined,
  };
}

export type MakeCommonDossierColumnsForSync = (
  dossierDS: DossierDS88444,
  pitchouKeyToChampDS: Map<string, ChampDescriptor["id"]>,
  pitchouKeyToAnnotationDS: Map<string, ChampDescriptor["id"]>,
) => DossierInitializer | DossierMutator;

/**
 * Retrieves the data of a DS dossier needed to create the personnes and the entreprises (déposants and demandeurs) in the database.
 * The first parameter of pitchouKeyToChampDS must be a string that represents a key of the DossierDémarcheSimplifiée
 */
export type GetPersonnesEntreprisesData = (
  dossierDS: DossierDS88444,
  pitchouKeyToChampDS: Map<string, ChampDescriptor["id"]>,
) => PersonnesEntreprisesDataInitializer;

/** Builds a two-line postal address string ("street\npostalCode city") from a structured DS address. */
function formatPostalAddress(
  address: DemarchesSimplifeesAddress | null | undefined,
): string | undefined {
  if (!address) {
    return undefined;
  }
  const { streetAddress, postalCode, cityName } = address;
  const secondLine = [postalCode, cityName].filter(Boolean).join(" ");
  return [streetAddress, secondLine].filter(Boolean).join("\n") || undefined;
}

export function getPersonnesEntreprisesData88444(
  dossierDS: DossierDS88444,
  pitchouKeyToChampDS: Map<keyof DossierDemarcheNumerique88444, ChampDescriptor["id"]>,
): PersonnesEntreprisesDataInitializer {
  const { demandeur, champs, nomMandataire = "", prenomMandataire = "", usager } = dossierDS;

  /**
   * Fields
   */
  /** @type {Map<string | undefined, Champs88444>} */
  /** @type {Map<string | undefined, any>} */
  const champById = new Map();
  for (const champ of champs) {
    champById.set(champ.id, champ);
  }

  /*
    Déposant

    Person returned by the DS identity block ("Identité du demandeur" in the DN
    interface), found in the `demandeur` property of the DS API (which is different
    from our "demandeur"). Used to create/find the personne in the database.

    The identities displayed in the "Porteur de projet" tab (demandeur, mandataire,
    representant) are returned separately in `identites` and stored as per-dossier
    snapshots (identite_dossier table), because the personne table cannot represent
    two different people sharing the same email (unique email constraint).
    */
  /** @type {PersonneInitializer} */
  let deposant;
  /*
    Demandeur
    Personne physique or morale who formulates the demande de dérogation espèces protégées
    */
  /** @type {PersonneInitializer | undefined} */
  let demandeurPersonnePhysique = undefined;
  /** @type {Entreprise | undefined} */
  let demandeurPersonneMorale = undefined;

  /** @type {DossierDemarcheNumerique88444['Le demandeur est…'] | undefined} */
  const personneMoraleOuPhysique = champById.get(
    pitchouKeyToChampDS.get("Le demandeur est…"),
  )?.stringValue;

  // Contact information, shared by the physical person and the legal entity's representative.
  const phoneContact = champById.get(
    pitchouKeyToChampDS.get("Numéro de téléphone de contact"),
  )?.stringValue;
  const emailContact = champById.get(
    pitchouKeyToChampDS.get("Adresse mail de contact"),
  )?.stringValue;

  const hasMandataire = Boolean(nomMandataire || prenomMandataire);

  // demandeur.email (the identity block's "Adresse électronique") is filled when the
  // dossier is submitted by a third party; otherwise DN displays the usager's account
  // email there, which the API only exposes as usager.email.
  const demandeurIdentityEmail = demandeur.email || (hasMandataire ? undefined : usager.email);

  deposant = {
    first_names: demandeur.prenom,
    last_name: demandeur.nom,
    email: demandeurIdentityEmail ? normalizeEmail(demandeurIdentityEmail) : undefined,
  };

  const identites: IdentiteDossierData[] = [
    {
      type: "demandeur",
      last_name: demandeur.nom || null,
      first_names: demandeur.prenom || null,
      email: demandeurIdentityEmail ? normalizeEmail(demandeurIdentityEmail) : null,
      phone: null,
      role: null,
    },
  ];

  if (hasMandataire) {
    identites.push({
      type: "mandataire",
      last_name: nomMandataire || null,
      first_names: prenomMandataire || null,
      // The usager account that submitted the dossier is the mandataire's.
      email: usager.email ? normalizeEmail(usager.email) : null,
      phone: null,
      role: null,
    });
  }

  if (personneMoraleOuPhysique === "une personne physique") {
    const { prenom, nom: lastName } = demandeur;

    const email = emailContact || demandeur.email || deposant.email;

    // "Adresse" is a BAN address champ: it carries a structured `address` sub-object.
    const addressChamp = champById.get(pitchouKeyToChampDS.get("Adresse"));
    const role = champById.get(pitchouKeyToChampDS.get("Qualification"))?.stringValue;

    demandeurPersonnePhysique = {
      first_names: prenom,
      last_name: lastName,
      email: email ? normalizeEmail(email) : undefined,
      address: formatPostalAddress(addressChamp?.address),
      phone: phoneContact || undefined,
      role: role || undefined,
    };
  }

  const SIRETChamp = champById.get(pitchouKeyToChampDS.get("Numéro de SIRET"));
  if (SIRETChamp) {
    const etablissement = SIRETChamp.etablissement;
    if (etablissement) {
      const { siret, address, entreprise, libelleNaf, naf } = etablissement;
      const {
        raisonSociale,
        siren,
        formeJuridique,
        dateCreation,
        etatAdministratif,
        capitalSocial,
        codeEffectifEntreprise,
      } = entreprise ?? {};

      demandeurPersonneMorale = {
        siret,
        legal_name: raisonSociale,
        address: formatPostalAddress(address),
        siren: siren || undefined,
        legal_form: formeJuridique || undefined,
        naf_code: naf || undefined,
        naf_label: libelleNaf || undefined,
        creation_date: dateCreation || undefined,
        admin_status: etatAdministratif || undefined,
        headcount: inseeHeadcountRangeLabel(codeEffectifEntreprise),
        // capitalSocial is "-1" when unknown.
        share_capital: capitalSocial && capitalSocial !== "-1" ? capitalSocial : undefined,
        insee_code: address?.cityCode || undefined,
        postal_code: address?.postalCode || undefined,
        department: address?.departmentName || undefined,
        region: address?.regionName || undefined,
      };
    }
  }

  // The representant is the contact person within the legal entity (personne morale).
  if (personneMoraleOuPhysique === "une personne morale") {
    const lastName = champById.get(pitchouKeyToChampDS.get("Nom du représentant"))?.stringValue;
    const firstNames = champById.get(
      pitchouKeyToChampDS.get("Prénom du représentant"),
    )?.stringValue;
    const role = champById.get(pitchouKeyToChampDS.get("Qualité du représentant"))?.stringValue;

    if (lastName || firstNames || role || emailContact || phoneContact) {
      identites.push({
        type: "representant",
        last_name: lastName || null,
        first_names: firstNames || null,
        email: emailContact ? normalizeEmail(emailContact) : null,
        phone: phoneContact || null,
        role: role || null,
      });
    }
  }

  return {
    deposant,
    demandeur_personne_morale: demandeurPersonneMorale,
    demandeur_personne_physique: demandeurPersonnePhysique,
    identites,
  };
}

/**
 * Returns the list of DS dossiers to initialize and the list of DS dossiers to modify from the complete list of DS dossiers to synchronize.
 * The condition "this dossier is a dossier to initialize" is checked by verifying that the dossier's Démarche Numérique number does not already exist in the database.
 */
function splitDossiersToInitializeAndToUpdate(
  dossiersDS: DossierDS88444[],
  dossierNumberToDossierId: Map<Dossier["demarche_numerique_number"], Dossier["id"]>,
): { dossiersDSToInitialize: DossierDS88444[]; dossiersDSToUpdate: DossierDS88444[] } {
  let dossiersDSToInitialize: DossierDS88444[] = [];
  let dossiersDSToUpdate: DossierDS88444[] = [];

  dossiersDS.forEach((dossier) => {
    if (dossierNumberToDossierId.has(String(dossier.number))) {
      dossiersDSToUpdate.push(dossier);
    } else {
      dossiersDSToInitialize.push(dossier);
    }
  });

  assert.deepEqual(
    dossiersDSToUpdate.length + dossiersDSToInitialize.length,
    dossiersDS.length,
    `Une erreur est survenue lors de la séparation des dossiers DS en dossiers DS à initialiser (${dossiersDSToInitialize.length} dossiers à modifier) et en dossiers DS à modifier (${dossiersDSToUpdate.length} dossiers à modifier)`,
  );

  return { dossiersDSToInitialize, dossiersDSToUpdate };
}

/**
 * Returns the dossier filled with the fields required for the initialization of a new dossier
 */
async function makeChampsDossierForInitialization(
  dossierDS: DossierDS88444,
  demarcheNumber: number,
  pitchouKeyToChampDS: Map<string, ChampDescriptor["id"]>,
  pitchouKeyToAnnotationDS: Map<string, ChampDescriptor["id"]>,
  makeCommonDossierColumnsForSync: MakeCommonDossierColumnsForSync,
): Promise<Partial<DossierForInsert> & Pick<DossierForInsert, "dossier">> {
  const additionalDataToDecrypt = dossierDS?.champs.find(
    (champ) => champ.label === "NE PAS MODIFIER - Données techniques associées à votre dossier",
  )?.stringValue;

  /**
   * FOR IMPORTING HISTORICAL DOSSIERS
   */
  let additionalData: Partial<DossierForInsert> | undefined;
  try {
    additionalData = additionalDataToDecrypt
      ? mapPersistedAdditionalData(
          JSON.parse(
            await decryptDossiersAdditionalData(additionalDataToDecrypt),
          ) as AdditionalDataForDossierCreation,
        )
      : undefined;

    if (additionalData) {
      // These data will be used later to fill in fields in the database
      console.log(
        `Il y a des données supplémentaires dans le dossier DN`,
        dossierDS.number,
        additionalData,
      );
    }
  } catch (error) {
    console.warn(
      `Une erreur est survenue pendant le déchiffrage des données supplémentaires: ${error}`,
    );
  }

  return {
    dossier: {
      ...makeCommonDossierColumnsForSync(dossierDS, pitchouKeyToChampDS, pitchouKeyToAnnotationDS),
      ...(additionalData?.dossier || {}),
      depot_date: additionalData?.dossier?.depot_date ?? dossierDS.dateDepot,
      demarche_number: demarcheNumber,
    },
    evenement_phase_dossier: additionalData?.evenement_phase_dossier,
    avis_expert: additionalData?.avis_expert,
    decision_administrative: additionalData?.decision_administrative,
    followers: additionalData?.followers,
  };
}

/**
 * Converts the "state" of DS "traitements" into Pitchou phases
 * There is no automatic way to reach the "Vérification dossier" state from DS
 */
function traitementPhaseToDossierPhase(DSTraitementState: Traitement["state"]): DossierPhase {
  if (DSTraitementState === "en_construction") return "Accompagnement amont";
  if (DSTraitementState === "en_instruction") return "Instruction";
  if (DSTraitementState === "accepte") return "Contrôle";
  if (DSTraitementState === "sans_suite") return "Classé sans suite";
  if (DSTraitementState === "refuse") return "Obligations terminées";

  throw `Traitement phase non reconnue: ${DSTraitementState}`;
}

function makeEvenementsPhaseDossierFromTraitementsDS(
  traitements: DossierDS88444["traitements"],
  dossierId?: Dossier["id"],
) {
  const evenementsPhaseDossier: DossierForInsert["evenement_phase_dossier"] = [];

  for (const { dateTraitement, state, emailAgentTraitant, motivation } of traitements) {
    evenementsPhaseDossier.push({
      phase: traitementPhaseToDossierPhase(state),
      dossier: dossierId,
      timestamp: new Date(dateTraitement),
      caused_by_personne: null, // means that the DS sync tool is the cause
      demarche_numerique_agent_email: emailAgentTraitant,
      demarche_numerique_motivation: motivation,
    });
  }

  return evenementsPhaseDossier;
}

/**
 * Synchronization of the décisions administratives
 * We create a décision administrative for the dossier that has an associated motivation file.
 *
 * We use the dossier's last traitement to determine the type of décision administrative (acceptance, refusal).
 * `idPitchouDuDossier`: if the dossier is to be inserted and not updated, then the dossier id does not exist yet and it is set to null.
 */
function makeDecisionAdministrativeFromTraitementDS(
  dossierDS: DossierDS88444,
  downloadedFichiersMotivation: Map<DossierDS88444["number"], FileId> | undefined,
  idPitchouDuDossier: DecisionAdministrative["dossier"] | null,
): PartialBy<DecisionAdministrativeInitializer, "dossier">[] {
  const decisionsAdministratives: PartialBy<DecisionAdministrativeInitializer, "dossier">[] = [];

  const fichierMotivationId = downloadedFichiersMotivation?.get(dossierDS.number);

  if (fichierMotivationId) {
    let type: TypeDecisionAdministrative = "Autre décision";

    const traitements = dossierDS.traitements;
    let lastTraitement = traitements[0];
    for (const traitement of traitements) {
      if (isAfter(traitement.dateTraitement, lastTraitement.dateTraitement)) {
        lastTraitement = traitement;
      }
    }
    if (lastTraitement.state === "accepte") type = "Arrêté dérogation";
    if (lastTraitement.state === "refuse") type = "Arrêté refus";

    decisionsAdministratives.push({
      dossier: idPitchouDuDossier ?? undefined,
      fichier: fichierMotivationId,
      type,
      signature_date: null, // no default value
      number: null,
      obligations_end_date: null,
    });
  }

  return decisionsAdministratives;
}

/**
 * Retrieves the raw dossier data from Démarche Numérique
 * then transforms it into the format expected by the application
 * in order to allow its insertion or update in the database.
 */
export async function makeDossiersForSynchronization(
  dossiersDS: DossierDS88444[],
  demarcheNumber: number,
  dossierNumberToDossierId: Map<Dossier["demarche_numerique_number"], Dossier["id"]>,
  downloadedFichiersMotivation: Map<number, FileId> | undefined,
  pitchouKeyToChampDS: Map<string, ChampDescriptor["id"]>,
  pitchouKeyToAnnotationDS: Map<string, ChampDescriptor["id"]>,
  getPersonnesEntreprisesData: GetPersonnesEntreprisesData,
  makeCommonDossierColumnsForSync: MakeCommonDossierColumnsForSync,
): Promise<{
  dossiersToInitializeForSync: DossierEntreprisesPersonneInitializersForInsert[];
  dossiersToUpdateForSync: DossierEntreprisesPersonneInitializersForUpdate[];
}> {
  const { dossiersDSToInitialize, dossiersDSToUpdate } = splitDossiersToInitializeAndToUpdate(
    dossiersDS,
    dossierNumberToDossierId,
  );

  const dossiersToInitializeForSyncP: Promise<DossierEntreprisesPersonneInitializersForInsert>[] =
    dossiersDSToInitialize.map((dossierDS) => {
      const champsDossierForInitP = makeChampsDossierForInitialization(
        dossierDS,
        demarcheNumber,
        pitchouKeyToChampDS,
        pitchouKeyToAnnotationDS,
        makeCommonDossierColumnsForSync,
      );

      const evenementPhaseDossier = makeEvenementsPhaseDossierFromTraitementsDS(
        dossierDS.traitements,
      );

      const decisionAdministrative = makeDecisionAdministrativeFromTraitementDS(
        dossierDS,
        downloadedFichiersMotivation,
        null,
      );

      return champsDossierForInitP.then((champsDossierForInit) => ({
        dossier: {
          ...champsDossierForInit.dossier,
          ...getPersonnesEntreprisesData(dossierDS, pitchouKeyToChampDS),
        },
        // The phase events returned by makeEvenementsPhaseDossierFromTraitementsDS
        // only concern the dossiers to update (not the ones being created)
        evenement_phase_dossier:
          champsDossierForInit.evenement_phase_dossier ?? evenementPhaseDossier,
        avis_expert: champsDossierForInit.avis_expert || [],
        decision_administrative: [
          ...(champsDossierForInit.decision_administrative || []),
          ...decisionAdministrative,
        ],
        followers: champsDossierForInit.followers,
      }));
    });

  const dossiersToUpdateForSync = dossiersDSToUpdate.map((dossierDS) => {
    const dossierId = dossierNumberToDossierId.get(String(dossierDS.number));

    if (!dossierId) {
      throw new Error(
        `dossier.id non trouvé pour dossier DS ${dossierDS.number} qui est en base de données`,
      );
    }

    const partialDossier = makeCommonDossierColumnsForSync(
      dossierDS,
      pitchouKeyToChampDS,
      pitchouKeyToAnnotationDS,
    );

    const evenementPhaseDossier = makeEvenementsPhaseDossierFromTraitementsDS(
      dossierDS.traitements,
      dossierId,
    );

    const decisionAdministrative = makeDecisionAdministrativeFromTraitementDS(
      dossierDS,
      downloadedFichiersMotivation,
      dossierId,
    );

    return {
      dossier: {
        ...partialDossier,
        ...getPersonnesEntreprisesData(dossierDS, pitchouKeyToChampDS),
      },
      evenement_phase_dossier: evenementPhaseDossier,
      decision_administrative: decisionAdministrative,
    };
  });

  const dossiersToInitializeForSync = await Promise.all(dossiersToInitializeForSyncP);

  return {
    dossiersToInitializeForSync,
    dossiersToUpdateForSync,
  };
}
