import assert from "node:assert/strict";
import { déchiffrerDonnéesSupplémentairesDossiers } from "../../scripts/server/démarche-numérique/chiffrerDéchiffrerDonnéesSupplémentaires.ts";
import { isAfter } from "date-fns";
import { normalisationEmail } from "../../scripts/commun/manipulationStrings.ts";

import type {
  DonnéesPersonnesEntreprisesInitializer,
  DossierEntreprisesPersonneInitializersPourInsert,
  DossierEntreprisesPersonneInitializersPourUpdate,
  DossierPourInsert,
} from "../../scripts/types/démarche-numérique/DossierPourSynchronisation.ts";
import type { DossierDemarcheNumerique88444 } from "../../scripts/types/démarche-numérique/Démarche88444.ts";
import type { ChampDescriptor } from "../../scripts/types/démarche-numérique/schema.ts";
import type {
  DossierDS88444,
  Traitement,
} from "../../scripts/types/démarche-numérique/apiSchema.ts";
import type Dossier from "../../scripts/types/database/public/Dossier.ts";
import type { FichierId } from "../../scripts/types/database/public/Fichier.ts";
import type {
  default as DécisionAdministrative,
  DCisionAdministrativeInitializer as DécisionAdministrativeInitializer,
} from "../../scripts/types/database/public/DécisionAdministrative.ts";
import type { PartialBy } from "../../scripts/types/tools.d.ts";
import type { TypeDécisionAdministrative, DossierPhase } from "../../scripts/types/API_Pitchou.ts";
import type { DonnéesSupplémentairesPourCréationDossier } from "../../scripts/front-end/actions/importDossierUtils.ts";
import type {
  DossierInitializer,
  DossierMutator,
} from "../../scripts/types/database/public/Dossier.ts";

export type MakeColonnesCommunesDossierPourSynchro = (
  dossierDS: DossierDS88444,
  pitchouKeyToChampDS: Map<string, ChampDescriptor["id"]>,
  pitchouKeyToAnnotationDS: Map<string, ChampDescriptor["id"]>,
) => DossierInitializer | DossierMutator;

/**
 * Récupère les données d'un dossier DS nécessaires pour créer les personnes et les entreprises (déposants et demandeurs) en base de données.
 * Le premier paramètre de pitchouKeyToChampDS doit être une chaîne de caractère qui représente une clef du DossierDémarcheSimplifiée
 */
export type GetDonnéesPersonnesEntreprises = (
  dossierDS: DossierDS88444,
  pitchouKeyToChampDS: Map<string, ChampDescriptor["id"]>,
) => DonnéesPersonnesEntreprisesInitializer;

export function getDonnéesPersonnesEntreprises88444(
  dossierDS: DossierDS88444,
  pitchouKeyToChampDS: Map<keyof DossierDemarcheNumerique88444, ChampDescriptor["id"]>,
): DonnéesPersonnesEntreprisesInitializer {
  const { demandeur, champs, nomMandataire = "", prenomMandataire = "", usager } = dossierDS;

  /**
   * Champs
   */
  /** @type {Map<string | undefined, Champs88444>} */
  /** @type {Map<string | undefined, any>} */
  const champById = new Map();
  for (const champ of champs) {
    champById.set(champ.id, champ);
  }

  /*
    Déposant

    Le déposant est la personne qui dépose le dossier sur DS
    Dans certaines situations, cette personne est différente du demandeur (personne morale ou physique
    qui demande la dérogation), par exemple, si un bureau d'étude mandaté par une personne morale dépose
    le dossier
    Le déposant n'est pas forcément représentant interne (point de contact principale) du demandeur

    Dans la nomenclature DS, ce que nous appelons "déposant" se trouve dans la propriété "demandeur"
    (qui est différent de notre "demandeur")

    */
  /** @type {PersonneInitializer} */
  let déposant;
  /*
    Demandeur
    Personne physique ou morale qui formule la demande de dérogation espèces protégées
    */
  /** @type {PersonneInitializer | undefined} */
  let demandeur_personne_physique = undefined;
  /** @type {Entreprise | undefined} */
  let demandeur_personne_morale = undefined;

  /** @type {DossierDemarcheNumerique88444['Le demandeur est…'] | undefined} */
  const personneMoraleOuPhysique = champById.get(
    pitchouKeyToChampDS.get("Le demandeur est…"),
  )?.stringValue;

  if ((nomMandataire || prenomMandataire) && personneMoraleOuPhysique === "une personne physique") {
    déposant = {
      prénoms: prenomMandataire,
      nom: nomMandataire,
      email: normalisationEmail(usager.email),
    };
  } else {
    déposant = {
      prénoms: demandeur.prenom,
      nom: demandeur.nom,
      email: demandeur.email ? normalisationEmail(demandeur.email) : undefined,
    };
  }

  if (personneMoraleOuPhysique === "une personne physique") {
    const { prenom, nom } = demandeur;

    /** @type {DossierDemarcheNumerique88444['Adresse mail de contact'] | undefined} */
    const adresseEmailDeContact = champById.get(
      pitchouKeyToChampDS.get("Adresse mail de contact"),
    )?.stringValue;

    let email = adresseEmailDeContact || demandeur.email || déposant.email;

    demandeur_personne_physique = {
      prénoms: prenom,
      nom,
      email: email ? normalisationEmail(email) : undefined,
    };
  }

  const SIRETChamp = champById.get(pitchouKeyToChampDS.get("Numéro de SIRET"));
  if (SIRETChamp) {
    const etablissement = SIRETChamp.etablissement;
    if (etablissement) {
      const { siret, address = {}, entreprise } = etablissement;
      const { streetAddress, postalCode, cityName } = address;
      const { raisonSociale } = entreprise ?? {};

      demandeur_personne_morale = {
        siret,
        raison_sociale: raisonSociale,
        adresse: `${streetAddress}\n${postalCode} ${cityName}`,
      };
    }
  }

  return {
    déposant,
    demandeur_personne_morale,
    demandeur_personne_physique,
  };
}

/**
 * Renvoie la liste des dossiers DS à initialiser la liste des dossiers DS à modifier à partir de la liste complète des dossiers DS à synchroniser.
 * La condition "ce dossier est un dossier à initialiser" se fait en vérifiant que le numéro de Démarche Numérique du dossier n'existe pas déjà en base de données.
 */
function splitDossiersEnAInitialiserAModifier(
  dossiersDS: DossierDS88444[],
  dossierNumberToDossierId: Map<Dossier["number_demarches_simplifiées"], Dossier["id"]>,
): { dossiersDSAInitialiser: DossierDS88444[]; dossiersDSAModifier: DossierDS88444[] } {
  let dossiersDSAInitialiser: DossierDS88444[] = [];
  let dossiersDSAModifier: DossierDS88444[] = [];

  dossiersDS.forEach((dossier) => {
    if (dossierNumberToDossierId.has(String(dossier.number))) {
      dossiersDSAModifier.push(dossier);
    } else {
      dossiersDSAInitialiser.push(dossier);
    }
  });

  assert.deepEqual(
    dossiersDSAModifier.length + dossiersDSAInitialiser.length,
    dossiersDS.length,
    `Une erreur est survenue lors de la séparation des dossiers DS en dossiers DS à initialiser (${dossiersDSAInitialiser.length} dossiers à modifier) et en dossiers DS à modifier (${dossiersDSAModifier.length} dossiers à modifier)`,
  );

  return { dossiersDSAInitialiser, dossiersDSAModifier };
}

/**
 * Renvoyer le dossier rempli des champs obligatoires pour l'initialisation d'un nouveau dossier
 */
async function makeChampsDossierPourInitialisation(
  dossierDS: DossierDS88444,
  démarcheNumber: number,
  pitchouKeyToChampDS: Map<string, ChampDescriptor["id"]>,
  pitchouKeyToAnnotationDS: Map<string, ChampDescriptor["id"]>,
  makeColonnesCommunesDossierPourSynchro: MakeColonnesCommunesDossierPourSynchro,
): Promise<Partial<DossierPourInsert> & Pick<DossierPourInsert, "dossier">> {
  const données_supplémentaires_à_déchiffrer = dossierDS?.champs.find(
    (champ) => champ.label === "NE PAS MODIFIER - Données techniques associées à votre dossier",
  )?.stringValue;

  /**
   * POUR IMPORT DOSSIERS HISTORIQUES
   */
  let données_supplémentaires: DonnéesSupplémentairesPourCréationDossier | undefined;
  try {
    données_supplémentaires = données_supplémentaires_à_déchiffrer
      ? JSON.parse(
          await déchiffrerDonnéesSupplémentairesDossiers(données_supplémentaires_à_déchiffrer),
        )
      : undefined;

    if (données_supplémentaires) {
      // Ces données seront utilisées plus tard pour remplir des champs en base de données
      console.log(
        `Il y a des données supplémentaires dans le dossier DN`,
        dossierDS.number,
        données_supplémentaires,
      );
    }
  } catch (erreur) {
    console.warn(
      `Une erreur est survenue pendant le déchiffrage des données supplémentaires: ${erreur}`,
    );
  }

  return {
    dossier: {
      ...makeColonnesCommunesDossierPourSynchro(
        dossierDS,
        pitchouKeyToChampDS,
        pitchouKeyToAnnotationDS,
      ),
      ...(données_supplémentaires?.dossier || {}),
      date_dépôt: données_supplémentaires?.dossier?.date_dépôt ?? dossierDS.dateDepot,
      numéro_démarche: démarcheNumber,
    },
    évènement_phase_dossier: données_supplémentaires?.évènement_phase_dossier,
    avis_expert: données_supplémentaires?.avis_expert,
    décision_administrative: données_supplémentaires?.décision_administrative,
    personnes_qui_suivent: données_supplémentaires?.personnes_qui_suivent,
  };
}

/**
 * Converti les "state" des "traitements" DS vers les phases Pitchou
 * Il n'existe pas de manière automatique de d'amener vers l'état "Vérification dossier" depuis DS
 */
function traitementPhaseToDossierPhase(DSTraitementState: Traitement["state"]): DossierPhase {
  if (DSTraitementState === "en_construction") return "Accompagnement amont";
  if (DSTraitementState === "en_instruction") return "Instruction";
  if (DSTraitementState === "accepte") return "Contrôle";
  if (DSTraitementState === "sans_suite") return "Classé sans suite";
  if (DSTraitementState === "refuse") return "Obligations terminées";

  throw `Traitement phase non reconnue: ${DSTraitementState}`;
}

function makeÉvènementsPhaseDossierFromTraitementsDS(
  traitements: DossierDS88444["traitements"],
  dossierId?: Dossier["id"],
) {
  const évènementsPhaseDossier: DossierPourInsert["évènement_phase_dossier"] = [];

  for (const { dateTraitement, state, emailAgentTraitant, motivation } of traitements) {
    évènementsPhaseDossier.push({
      phase: traitementPhaseToDossierPhase(state),
      dossier: dossierId,
      horodatage: new Date(dateTraitement),
      cause_personne: null, // signifie que c'est l'outil de sync DS qui est la cause
      DS_emailAgentTraitant: emailAgentTraitant,
      DS_motivation: motivation,
    });
  }

  return évènementsPhaseDossier;
}

/**
 * Synchronisation des décisions administratives
 * On crée une décision administrative pour le dossier qui a un fichier de motivation associé.
 *
 * On utilise le dernier traitement du dossier pour déterminer le type de décision administrative (acceptation, refus).
 * `idPitchouDuDossier`: si le dossier est à insérer et pas à updater, alors l'id du dossier n'existe pas encore et il est défini à null.
 */
function makeDécisionAdministrativeFromTraitementDS(
  dossierDS: DossierDS88444,
  fichiersMotivationTéléchargés: Map<DossierDS88444["number"], FichierId> | undefined,
  idPitchouDuDossier: DécisionAdministrative["dossier"] | null,
): PartialBy<DécisionAdministrativeInitializer, "dossier">[] {
  const décisionsAdministratives: PartialBy<DécisionAdministrativeInitializer, "dossier">[] = [];

  const fichierMotivationId = fichiersMotivationTéléchargés?.get(dossierDS.number);

  if (fichierMotivationId) {
    let type: TypeDécisionAdministrative = "Autre décision";

    const traitements = dossierDS.traitements;
    let dernierTraitement = traitements[0];
    for (const traitement of traitements) {
      if (isAfter(traitement.dateTraitement, dernierTraitement.dateTraitement)) {
        dernierTraitement = traitement;
      }
    }
    if (dernierTraitement.state === "accepte") type = "Arrêté dérogation";
    if (dernierTraitement.state === "refuse") type = "Arrêté refus";

    décisionsAdministratives.push({
      dossier: idPitchouDuDossier ?? undefined,
      fichier: fichierMotivationId,
      type,
      date_signature: null, // pas de remplissage par défaut
      numéro: null,
      date_fin_obligations: null,
    });
  }

  return décisionsAdministratives;
}

/**
 * Récupère les données brutes des dossiers depuis Démarche Numérique
 * puis les transforme au format attendu par l'application
 * afin de permettre leur insertion ou mise à jour en base de données.
 */
export async function makeDossiersPourSynchronisation(
  dossiersDS: DossierDS88444[],
  démarcheNumber: number,
  numberDSDossiersDéjàExistantsEnBDD: Map<Dossier["number_demarches_simplifiées"], Dossier["id"]>,
  fichiersMotivationTéléchargés: Map<number, FichierId> | undefined,
  pitchouKeyToChampDS: Map<string, ChampDescriptor["id"]>,
  pitchouKeyToAnnotationDS: Map<string, ChampDescriptor["id"]>,
  getDonnéesPersonnesEntreprises: GetDonnéesPersonnesEntreprises,
  makeColonnesCommunesDossierPourSynchro: MakeColonnesCommunesDossierPourSynchro,
): Promise<{
  dossiersAInitialiserPourSynchro: DossierEntreprisesPersonneInitializersPourInsert[];
  dossiersAModifierPourSynchro: DossierEntreprisesPersonneInitializersPourUpdate[];
}> {
  const { dossiersDSAInitialiser, dossiersDSAModifier } = splitDossiersEnAInitialiserAModifier(
    dossiersDS,
    numberDSDossiersDéjàExistantsEnBDD,
  );

  const dossiersAInitialiserPourSynchroP: Promise<DossierEntreprisesPersonneInitializersPourInsert>[] =
    dossiersDSAInitialiser.map((dossierDS) => {
      const champsDossierPourInitP = makeChampsDossierPourInitialisation(
        dossierDS,
        démarcheNumber,
        pitchouKeyToChampDS,
        pitchouKeyToAnnotationDS,
        makeColonnesCommunesDossierPourSynchro,
      );

      const évènement_phase_dossier = makeÉvènementsPhaseDossierFromTraitementsDS(
        dossierDS.traitements,
      );

      const décision_administrative = makeDécisionAdministrativeFromTraitementDS(
        dossierDS,
        fichiersMotivationTéléchargés,
        null,
      );

      return champsDossierPourInitP.then((champsDossierPourInit) => ({
        dossier: {
          ...champsDossierPourInit.dossier,
          ...getDonnéesPersonnesEntreprises(dossierDS, pitchouKeyToChampDS),
        },
        // Les évènements phases retournées par makeÉvènementsPhaseDossierFromTraitementsDS
        // ne concernent que les dossiers à mettre à jour (pas ceux créés)
        évènement_phase_dossier:
          champsDossierPourInit.évènement_phase_dossier ?? évènement_phase_dossier,
        avis_expert: champsDossierPourInit.avis_expert || [],
        décision_administrative: [
          ...(champsDossierPourInit.décision_administrative || []),
          ...décision_administrative,
        ],
        personnes_qui_suivent: champsDossierPourInit.personnes_qui_suivent,
      }));
    });

  const dossiersAModifierPourSynchro = dossiersDSAModifier.map((dossierDS) => {
    const dossierId = numberDSDossiersDéjàExistantsEnBDD.get(String(dossierDS.number));

    if (!dossierId) {
      throw new Error(
        `dossier.id non trouvé pour dossier DS ${dossierDS.number} qui est en base de données`,
      );
    }

    const dossierPartiel = makeColonnesCommunesDossierPourSynchro(
      dossierDS,
      pitchouKeyToChampDS,
      pitchouKeyToAnnotationDS,
    );

    const évènement_phase_dossier = makeÉvènementsPhaseDossierFromTraitementsDS(
      dossierDS.traitements,
      dossierId,
    );

    const décision_administrative = makeDécisionAdministrativeFromTraitementDS(
      dossierDS,
      fichiersMotivationTéléchargés,
      dossierId,
    );

    return {
      dossier: {
        ...dossierPartiel,
        ...getDonnéesPersonnesEntreprises(dossierDS, pitchouKeyToChampDS),
      },
      évènement_phase_dossier,
      décision_administrative,
    };
  });

  const dossiersAInitialiserPourSynchro = await Promise.all(dossiersAInitialiserPourSynchroP);

  return {
    dossiersAInitialiserPourSynchro,
    dossiersAModifierPourSynchro,
  };
}
