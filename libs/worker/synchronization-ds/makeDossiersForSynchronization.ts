import assert from "node:assert/strict";
import { decryptDossiersAdditionalData } from "@pitchou/server/demarche-numerique/encryptDecryptDossiersAdditionalData.ts";
import { isAfter } from "date-fns";
import { normalizeEmail } from "@pitchou/common/stringManipulation.ts";
import { inseeHeadcountRangeLabel } from "./inseeHeadcountRange.ts";

import type {
  PersonnesEntreprisesDataInitializer,
  DossierEntreprisesPersonneInitializersForInsert,
  DossierEntreprisesPersonneInitializersForUpdate,
  DossierForInsert,
  IdentiteDossierData,
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
  DecisionAdministrativeInitializer as DecisionAdministrativeInitializer,
} from "@pitchou/types/database/public/DecisionAdministrative.ts";
import type { PartialBy } from "@pitchou/types/tools.d.ts";
import type { TypeDecisionAdministrative, DossierPhase } from "@pitchou/types/API_Pitchou.ts";
import type { AdditionalDataForDossierCreation } from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";
import type { DossierInitializer, DossierMutator } from "@pitchou/types/database/public/Dossier.ts";

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
  let déposant;
  /*
    Demandeur
    Personne physique or morale who formulates the demande de dérogation espèces protégées
    */
  /** @type {PersonneInitializer | undefined} */
  let demandeur_personne_physique = undefined;
  /** @type {Entreprise | undefined} */
  let demandeur_personne_morale = undefined;

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

  déposant = {
    prénoms: demandeur.prenom,
    nom: demandeur.nom,
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
    const { prenom, nom } = demandeur;

    const email = emailContact || demandeur.email || déposant.email;

    // "Adresse" is a BAN address champ: it carries a structured `address` sub-object.
    const adresseChamp = champById.get(pitchouKeyToChampDS.get("Adresse"));
    const role = champById.get(pitchouKeyToChampDS.get("Qualification"))?.stringValue;

    demandeur_personne_physique = {
      prénoms: prenom,
      nom,
      email: email ? normalizeEmail(email) : undefined,
      address: formatPostalAddress(adresseChamp?.address),
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

      demandeur_personne_morale = {
        siret,
        raison_sociale: raisonSociale,
        adresse: formatPostalAddress(address),
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
    const nom = champById.get(pitchouKeyToChampDS.get("Nom du représentant"))?.stringValue;
    const prénoms = champById.get(pitchouKeyToChampDS.get("Prénom du représentant"))?.stringValue;
    const role = champById.get(pitchouKeyToChampDS.get("Qualité du représentant"))?.stringValue;

    if (nom || prénoms || role || emailContact || phoneContact) {
      identites.push({
        type: "representant",
        last_name: nom || null,
        first_names: prénoms || null,
        email: emailContact ? normalizeEmail(emailContact) : null,
        phone: phoneContact || null,
        role: role || null,
      });
    }
  }

  return {
    déposant,
    demandeur_personne_morale,
    demandeur_personne_physique,
    identites,
  };
}

/**
 * Returns the list of DS dossiers to initialize and the list of DS dossiers to modify from the complete list of DS dossiers to synchronize.
 * The condition "this dossier is a dossier to initialize" is checked by verifying that the dossier's Démarche Numérique number does not already exist in the database.
 */
function splitDossiersToInitializeAndToUpdate(
  dossiersDS: DossierDS88444[],
  dossierNumberToDossierId: Map<Dossier["number_demarches_simplifiées"], Dossier["id"]>,
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
  let additionalData: AdditionalDataForDossierCreation | undefined;
  try {
    additionalData = additionalDataToDecrypt
      ? JSON.parse(await decryptDossiersAdditionalData(additionalDataToDecrypt))
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
      date_dépôt: additionalData?.dossier?.date_dépôt ?? dossierDS.dateDepot,
      numéro_démarche: demarcheNumber,
    },
    évènement_phase_dossier: additionalData?.évènement_phase_dossier,
    avis_expert: additionalData?.avis_expert,
    décision_administrative: additionalData?.décision_administrative,
    personnes_qui_suivent: additionalData?.personnes_qui_suivent,
  };
}

/**
 * Converts the "state" of DS "traitements" into Pitchou phases
 * There is no automatic way to reach the "Vérification dossier" state from DS
 */
function traitementPhaseToDossierPhase(DSTraitementState: Traitement["state"]): DossierPhase {
  if (DSTraitementState === "en_construction") return "Accompagnement amont";
  if (DSTraitementState === "en_instruction") return "Instruction";
  if (DSTraitementState === "accepte") return "Controle";
  if (DSTraitementState === "sans_suite") return "Classé sans suite";
  if (DSTraitementState === "refuse") return "Obligations terminées";

  throw `Traitement phase non reconnue: ${DSTraitementState}`;
}

function makeEvenementsPhaseDossierFromTraitementsDS(
  traitements: DossierDS88444["traitements"],
  dossierId?: Dossier["id"],
) {
  const evenementsPhaseDossier: DossierForInsert["évènement_phase_dossier"] = [];

  for (const { dateTraitement, state, emailAgentTraitant, motivation } of traitements) {
    evenementsPhaseDossier.push({
      phase: traitementPhaseToDossierPhase(state),
      dossier: dossierId,
      horodatage: new Date(dateTraitement),
      cause_personne: null, // means that the DS sync tool is the cause
      DS_emailAgentTraitant: emailAgentTraitant,
      DS_motivation: motivation,
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
      date_signature: null, // no default value
      numéro: null,
      date_fin_obligations: null,
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
  numberDSDossiersAlreadyExistingInDB: Map<Dossier["number_demarches_simplifiées"], Dossier["id"]>,
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
    numberDSDossiersAlreadyExistingInDB,
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

      const évènement_phase_dossier = makeEvenementsPhaseDossierFromTraitementsDS(
        dossierDS.traitements,
      );

      const décision_administrative = makeDecisionAdministrativeFromTraitementDS(
        dossierDS,
        downloadedFichiersMotivation,
        null,
      );

      return champsDossierForInitP.then((champsDossierForInit) => ({
        dossier: {
          ...champsDossierForInit.dossier,
          ...getPersonnesEntreprisesData(dossierDS, pitchouKeyToChampDS),
        },
        // The phase events returned by makeÉvènementsPhaseDossierFromTraitementsDS
        // only concern the dossiers to update (not the ones being created)
        évènement_phase_dossier:
          champsDossierForInit.évènement_phase_dossier ?? évènement_phase_dossier,
        avis_expert: champsDossierForInit.avis_expert || [],
        décision_administrative: [
          ...(champsDossierForInit.décision_administrative || []),
          ...décision_administrative,
        ],
        personnes_qui_suivent: champsDossierForInit.personnes_qui_suivent,
      }));
    });

  const dossiersToUpdateForSync = dossiersDSToUpdate.map((dossierDS) => {
    const dossierId = numberDSDossiersAlreadyExistingInDB.get(String(dossierDS.number));

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

    const évènement_phase_dossier = makeEvenementsPhaseDossierFromTraitementsDS(
      dossierDS.traitements,
      dossierId,
    );

    const décision_administrative = makeDecisionAdministrativeFromTraitementDS(
      dossierDS,
      downloadedFichiersMotivation,
      dossierId,
    );

    return {
      dossier: {
        ...partialDossier,
        ...getPersonnesEntreprisesData(dossierDS, pitchouKeyToChampDS),
      },
      évènement_phase_dossier,
      décision_administrative,
    };
  });

  const dossiersToInitializeForSync = await Promise.all(dossiersToInitializeForSyncP);

  return {
    dossiersToInitializeForSync,
    dossiersToUpdateForSync,
  };
}
