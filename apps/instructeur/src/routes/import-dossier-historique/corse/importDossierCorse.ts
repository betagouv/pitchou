import { isDate, setYear } from "date-fns";
import { isValidDateString } from "@pitchou/common/typeFormat.ts";
import {
  formatDepartementFromValue,
  extractCommunes,
  getCommuneData,
} from "../importDossierUtils.ts";

import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type {
  AdditionalDataForDossierCreation,
  Alert,
  DossierWithAlerts,
} from "../importDossierUtils.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { EvenementPhaseDossierInitializer } from "@pitchou/types/database/public/EvenementPhaseDossier.ts";
import type { PartialBy } from "@pitchou/types/tools.d.ts";
import type { AvisExpertInitializer } from "@pitchou/types/database/public/AvisExpert.ts";
import type { DecisionAdministrativeInitializer } from "@pitchou/types/database/public/DecisionAdministrative.ts";
import type { PersonneWithRequiredEmail } from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";

// Based on the spreadsheet sent on 25/07/2025
export type DossierCorseRow = {
  Remarques: string;
  Département: string;
  Commune: string;
  "Nom du demandeur": string;
  "Type de projet": string;
  "Libellé Projet": string;
  "Service Pilote": string;
  "Espèces impactées": string;
  Raccourci: string;
  Statut: string;
  "Niveau d'avancement": string;
  "Date de début d'accompagnement": number;
  "Date de réception 1er dossier": string | number | Date;
  "Date de réception du dossier autoportant": string | Date;
  "N°ONAGRE": string;
  "Date de dépôt sur ONAGRE": string | Date;
  "Instructeur DREAL": string;
  Compétence: string;
  "Avis rendu": string;
  "Date avis": string;
  Contribution: string;
  "Commentaires phase instruction": string;
  "Début consultation": string;
  "Fin de publication": string;
  "Numéro AP": string;
  "Date AP": string | Date;
  "Commentaires post AP": string;
};

const demandeurToSiret = new Map([
  ["ADIMAT", "33358398700032"],
  ["AÉROPORT DE CALVI", "30638506300038"],
  ["AKUO ENERGIE CORSE", "50518633800057"],
  ["ALTA PISCIA", "80130439500024"],
  ["AVENIR AGRICOLE", "30483961600014"],
  ["BETAG", "42228223600047"],
  ["BRANZIZI IMMOBILIER", "43941568800043"],
  ["CAPA", "24201005600073"],
  ["CCSC", "20004076400041"],
  ["CD2A", "20007695800012"],
  ["CDC PATRIMOINE", "20007695800012"],
  ["CDC ROUTES", "20007695800012"],
  ["CG2A", "20007695800012"],
  ["CLOS DES AMANDIERS", "91095159900018"],
  ["COMMUNAUTÉ DE COMMUNES DU SUD CORSE", "20004076400041"],
  ["CONSERVATOIRE DU LITTORAL", "18000501900435"],
  ["CONSTRUCTION DU CAP", "49722037600022"],
  ["CORSE TRAVAUX", "33046450400043"],
  ["CORSEA PROMOTION", "82329102600016"],
  ["CORSICA ENERGIA", "88097833300016"],
  ["CORSICA SOLE", "88802711700017"],
  ["COSICA SOLE", "88802711700017"], // TYPO
  ["DGAC", "13000577000081"],
  ["EDF", "55208131722061"],
  ["EDF PEI", "48996768700083"],
  ["EDF SEI", "55208131722061"],
  ["ERILIA", "5881167000064"],
  ["ISONI – DELTA BOIS", "48181865600011"],
  ["LANFRANCHI ENVIRONNEMENT", "50060870800037"],
  ["LE LOGIS CORSE", "31028856800051"],
  ["MAIRIE D'AMBIEGNA", "21200014500012"],
  ["MAIRIE DE BIGUGLIA", "21200037600013"],
  ["MAIRIE DE BORGO", "21200042600016"],
  ["MAIRIE DE CARGÈSE", "21200065700016"],
  ["MAIRIE DE PROPRIANO", "21200249700015"],
  ["MAIRIE GHISONACCIA", "21200123400013"],
  ["MINISTÈRE DES ARMÉES", "11009001600046"],
  ["OEHC", "33043264200016"],
  ["PROBAT", "42987846500021"],
  ["ROCCA FORTIMMO", "82334498100019"],
  ["ROCH LEANDRI", "45063550300037"],
  ["SACOI 3", "94471240500025"],
  ["SARL LANFRANCHI", "80815975000013"],
  ["SAS CAP SUD", "89229827400028"],
  ["SAS LDP IMMOBILIER", "79806317800015"],
  ["SAS ORIENTE ENVIRONNEMENT", "80970465300017"],
  ["SAS U FURNELLU", "51065127600014"],
  ["SAS VICTORIA CORP", "79960399800011"],
  ["SASU CANALE", "90182617200016"],
  ["SCCV DE L’ÉTANG D’ARASU", "81963241500017"],
  ["SCCV FORTIMMO (ROCCA)", "82334498100019"],
  ["SCCV LES RÉSIDENCES DE LA CRUCIATA", "82408014700013"],
  ["SCI COLOMBA - JEAN PERALDI", "50375429300010"],
  ["SCI RIVA BELLA", "80092305400012"],
  ["SCI RIVA BIANCA", "89338924700014"],
  ["SCVV RÉSIDENCE DU STILETTO (ROCCA)", "81320821200015"],
  ["SGBC", "33966853500059"],
  ["SNC MULINU D’ORZU", "82149158600011"],
  ["SSCB", "60675001600028"],
  ["SSCV DOMAINE DES OLIVIERS", "88036615800025"],
  ["STANECO", "39991981000024"],
  ["STOC (GROUPE PETRONI)", "39849006000025"],
  ["SUN’R", "50142867600305"],
  ["SYNDICAT RÉSIDENCE PANCRAZI", "84944461700013"],
  ["SYVADEC", "20000982700037"],
  ["TS PROMOTION", "82966042200017"],
  ["UNIVERSITÉ DE CORSE", "19202664900264"],
]);

export function createDossierName(row: DossierCorseRow): string {
  return row["Libellé Projet"];
}

type TypeDeProjetOptions =
  | "ZAE"
  | "Autres"
  | "Carrière (ICPE)"
  | "Centre de tri (ICPE)"
  | "Centre de vacances"
  | "Électrique"
  | "Hydroélectrique"
  | "Ouvrages d’art"
  | "Projet immobilier"
  | "Routes"
  | "Stockage de déchets (ISDND)";

const typeDeProjetToActivitePrincipale: Map<
  TypeDeProjetOptions,
  DossierDemarcheNumerique88444["Activité principale"]
> = new Map([
  ["ZAE", "ZAC"],
  ["Autres", "Autre"],
  ["Carrière (ICPE)", "Carrières"],
  ["Centre de tri (ICPE)", "Installations de gestion des déchets"],
  ["Centre de vacances", "Installations de loisir et de tourisme"],
  ["Électrique", "Transport énergie électrique"],
  ["Hydroélectrique", "Production énergie renouvelable - Hydroélectricité"],
  [
    "Ouvrages d’art",
    "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d’art",
  ],
  [
    "Projet immobilier",
    "Urbanisation logement (déclaration préalable travaux, PC, permis d’aménager)",
  ],
  ["Routes", "Infrastructures de transport routières"],
  ["Stockage de déchets (ISDND)", "Installations de gestion des déchets"],
]);

function convertTypeDeProjetToActivitePrincipale(
  row: DossierCorseRow,
  activitesPrincipales88444: Set<DossierDemarcheNumerique88444["Activité principale"]>,
): { data: DossierDemarcheNumerique88444["Activité principale"]; alertes: Alert[] } {
  const alertes: Alert[] = [];
  const typeDeProjet = row["Type de projet"].trim();

  // If the project type is already a pitchou value
  // @ts-ignore
  if (activitesPrincipales88444.has(typeDeProjet)) {
    // ts does not recognize the type of typeDeProjet
    // @ts-ignore
    return { data: typeDeProjet, alertes };
  }

  const activite = typeDeProjetToActivitePrincipale.get(typeDeProjet as TypeDeProjetOptions);
  if (activite) {
    return { data: activite, alertes };
  }

  const alertMessage = `Le type de projet de ce dossier est ${typeDeProjet}. Cette activité n'existe pas dans la liste des Activités Principales de la démarche 88444 (dans Pitchou). On attribue donc l'activité "Autre" à ce projet.`;
  console.warn(alertMessage);
  alertes.push({ type: "avertissement", message: alertMessage });

  return { data: "Autre", alertes: alertes };
}

function generateAutorisationEnvironnementaleData(
  row: DossierCorseRow,
): Pick<
  DossierDemarcheNumerique88444,
  | "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?"
  | "À quelle procédure le projet est-il soumis ?"
> {
  const projetType = row["Type de projet"].toLowerCase();

  const servicePiloteValue = row["Service Pilote"].trim().toUpperCase();

  if (projetType.includes("icpe")) {
    return {
      "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?":
        "Oui",
      "À quelle procédure le projet est-il soumis ?": ["Autorisation ICPE"],
    };
  }

  if (servicePiloteValue === "SBEP") {
    return {
      "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?":
        "Oui",
      "À quelle procédure le projet est-il soumis ?": [
        "Autorisation ICPE",
        "Autorisation loi sur l'eau",
      ],
    };
  }

  return {
    "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?":
      "Non",
    "À quelle procédure le projet est-il soumis ?": [],
  };
}

type LocalisationsData = Partial<
  Pick<
    DossierDemarcheNumerique88444,
    | "Commune(s) où se situe le projet"
    | "Département(s) où se situe le projet"
    | "Le projet se situe au niveau…"
  >
> &
  Pick<
    DossierDemarcheNumerique88444,
    "Dans quel département se localise majoritairement votre projet ?"
  >;

async function generateLocalisationsData(row: {
  Commune: string | undefined;
  Département: number | string;
}): Promise<{ data: LocalisationsData; alertes: Alert[] }> {
  const defaultDepartement = { code: "2A", nom: "Corse-du-Sud" };

  const communesValues = extractCommunes(row["Commune"] ?? "");

  const communesPromises = communesValues.map((com) => getCommuneData(com));
  const departementsPromise = formatDepartementFromValue(row["Département"]);

  const [departementsResult, communesResult] = await Promise.all([
    departementsPromise,
    Promise.all(communesPromises),
  ]);

  const communes = communesResult
    .map((communeResult) => communeResult.data)
    .filter((commune) => commune !== null);
  const alertesCommunes = communesResult
    .map((communeResult) => communeResult.alerte)
    .filter((alerte) => alerte !== undefined);
  let alertes = [...alertesCommunes, ...departementsResult.alertes];
  const foundDepartements = departementsResult.data;
  const departementColumn =
    Array.isArray(foundDepartements) && foundDepartements[0] ? foundDepartements[0] : undefined;

  // @ts-ignore
  let data: LocalisationsData = {};

  if (communes.length >= 1) {
    const firstCommuneDepartement = communes[0].departement;

    data = {
      "Commune(s) où se situe le projet": communes,
      "Département(s) où se situe le projet": undefined,
      "Le projet se situe au niveau…": "d'une ou plusieurs communes",
      "Dans quel département se localise majoritairement votre projet ?":
        departementColumn ?? firstCommuneDepartement,
    };
  } else {
    if (alertesCommunes.length >= 1) {
      alertes.push({
        message: `Au moins une commune a été spécifiée pour cette ligne, mais aucune n'a été trouvée.`,
        type: "erreur",
      });
    }
    const departments = Array.isArray(foundDepartements) ? foundDepartements : [defaultDepartement];
    data = {
      "Commune(s) où se situe le projet": undefined,
      "Département(s) où se situe le projet": departments,
      "Le projet se situe au niveau…": "d'un ou plusieurs départements",
      "Dans quel département se localise majoritairement votre projet ?": departments[0],
    };
  }

  return {
    alertes,
    data,
  };
}

function createAvisExpertData(
  row: DossierCorseRow,
): PartialBy<AvisExpertInitializer, "dossier">[] | undefined {
  const expert = row["Compétence"];
  const avis = row["Avis rendu"];
  const avisDate = new Date(row["Date avis"].toString());
  const dateDepotSurOnagreValue = row["Date de dépôt sur ONAGRE"];
  let saisineDate: AvisExpertInitializer["saisine_date"];

  if (isDate(dateDepotSurOnagreValue)) {
    saisineDate = new Date(dateDepotSurOnagreValue);
  }

  if (expert !== "" || avis !== "") {
    return [{ avis, avis_date: avisDate, expert, saisine_date: saisineDate }];
  }

  if (saisineDate) {
    return [{ saisine_date: saisineDate }];
  }
}

function createDecisionAdministrativeData(
  row: DossierCorseRow,
):
  | { data: PartialBy<DecisionAdministrativeInitializer, "dossier">[]; alertes: Alert[] }
  | undefined {
  const dateAPValue = row["Date AP"];

  if (!(!dateAPValue || (typeof dateAPValue === "string" && dateAPValue === ""))) {
    if (isValidDateString(dateAPValue.toString())) {
      return {
        data: [
          {
            signature_date: new Date(dateAPValue),
            type: "Autre décision",
            number: row["Numéro AP"],
          },
        ],
        alertes: [],
      };
    } else {
      const message = `La date indiquée dans la colonne Date AP est incorrecte : ${dateAPValue}. On n'importe donc pas de décision administrative.`;
      return { alertes: [{ message, type: "erreur" }], data: [] };
    }
  }
}

function createNextActionExpectedFromData(
  row: DossierCorseRow,
): DossierFull["next_action_expected_from"] | undefined {
  const niveauDAvancementValue = row["Niveau d'avancement"].trim();

  if (niveauDAvancementValue === "A faire") {
    return "Instructeur";
  }

  if (niveauDAvancementValue === "En attente") {
    return "Autre";
  }

  return undefined;
}

function createDateDepotData(row: DossierCorseRow): { data: Date; alertes?: Alert[] } {
  const dateDeDebutDaccompagnementValue = row["Date de début d'accompagnement"];

  if (dateDeDebutDaccompagnementValue.toString().length === 4) {
    return { data: new Date(dateDeDebutDaccompagnementValue, 0, 1) };
  } else {
    return {
      data: new Date(),
      alertes: [
        {
          type: "avertissement",
          message: `L'année renseignée dans la colonne "Date de début d'accompagnement" est incorrecte et égale à "${dateDeDebutDaccompagnementValue}". On ne peut donc pas renseigner la date de première sollicitation qui sera par défaut la date d'aujourd'hui.`,
        },
      ],
    };
  }
}

function getSiretIfDemandeurPersonneMorale(
  row: DossierCorseRow,
): { data?: string; alertes?: Alert[] } | undefined {
  const nomDuDemandeurValue = row["Nom du demandeur"].trim().toUpperCase();
  const siret = demandeurToSiret.get(nomDuDemandeurValue);
  if (!siret && nomDuDemandeurValue !== "") {
    return {
      alertes: [
        {
          type: "avertissement",
          message: `La colonne "Nom du demandeur" a pour valeur "${nomDuDemandeurValue} mais aucun siret correspondant n'a été trouvé."`,
        },
      ],
    };
  }

  if (siret) {
    return { data: siret };
  }
}

function createFollowersData(
  row: DossierCorseRow,
  emailsByInitials: Map<string, string>,
): PersonneWithRequiredEmail[] | undefined {
  const instructeurDREALValue = row["Instructeur DREAL"];
  const departementValue = row["Département"];

  const instructricesFound = instructeurDREALValue.replaceAll(" ", "").split("+");

  const followers: PersonneWithRequiredEmail[] = [];

  for (const instructriceFound of instructricesFound) {
    if (["BG", "MR", "MB"].includes(instructriceFound)) {
      if (departementValue === "2A") {
        followers.push({ email: emailsByInitials.get("CT") ?? "" });
      } else if (departementValue === "2B") {
        followers.push({ email: emailsByInitials.get("PZ") ?? "" });
      }
    }

    const foundEmail = emailsByInitials.get(instructriceFound);

    if (foundEmail && !followers.find((follower) => follower.email === foundEmail)) {
      followers.push({ email: foundEmail });
    }
  }

  if (followers.length >= 1) {
    return followers;
  }
}

type FreeCommentSection = {
  title: string;
  content: string | undefined;
};

/**
 * Extracts the additional data (NE PAS MODIFIER) from an import row.
 */
function createAdditionalDataFromRow(
  row: DossierCorseRow,
  emailsByInitials: Map<string, string>,
  demandeurPersonneMorale?: string,
): AdditionalDataForDossierCreation & { alertes: Alert[] } {
  const evenementPhaseDossierResult = createEvenementPhaseDossierData(row);

  const avisExpert = createAvisExpertData(row);

  const instructionPhaseComment: FreeCommentSection = {
    title: "Commentaire phase instruction",
    content: row["Commentaires phase instruction"],
  };
  const postDecisionComment: FreeCommentSection = {
    title: "Commentaires post AP",
    content: row["Commentaires post AP"],
  };
  const remarksComment: FreeCommentSection = {
    title: "Remarques",
    content: row["Remarques"],
  };
  const contributionComment: FreeCommentSection = {
    title: "Contribution",
    content: row["Contribution"],
  };

  const freeComment = [
    instructionPhaseComment,
    postDecisionComment,
    remarksComment,
    contributionComment,
  ]
    .filter((value) => value?.content?.trim())
    .map(({ title, content }) => `${title} : ${content}`)
    .join("\n");

  const decisionAdministrativeResult = createDecisionAdministrativeData(row);

  const dateDebutConsultation = isValidDateString(row["Début consultation"])
    ? new Date(row["Début consultation"])
    : undefined;
  const dateFinConsultation = isValidDateString(row["Fin de publication"])
    ? new Date(row["Fin de publication"])
    : undefined;

  const nextActionExpectedFrom = createNextActionExpectedFromData(row);

  const dateDepotResult = createDateDepotData(row);

  const dateDepot = dateDepotResult?.data;

  const followers = createFollowersData(row, emailsByInitials);

  const alertes = [
    ...(evenementPhaseDossierResult?.alertes ?? []),
    ...(decisionAdministrativeResult?.alertes ?? []),
    ...(dateDepotResult?.alertes ?? []),
  ];

  // The shared type also accepts historical decrypted payloads with legacy accented keys.
  return {
    dossier: {
      onagre_demande_identifier: row["N°ONAGRE"],
      depot_date: dateDepot,
      free_comment: freeComment,
      public_consultation_start_date: dateDebutConsultation,
      public_consultation_end_date: dateFinConsultation,
      next_action_expected_from: nextActionExpectedFrom,
      // @ts-ignore
      demandeur_personne_morale: demandeurPersonneMorale,
    },
    evenement_phase_dossier: evenementPhaseDossierResult?.data,
    alertes,
    avis_expert: avisExpert,
    decision_administrative: decisionAdministrativeResult?.data,
    followers,
  } as unknown as AdditionalDataForDossierCreation & { alertes: Alert[] };
}

/**
 *
 */
function createEvenementPhaseDossierData(
  row: DossierCorseRow,
):
  | { data: PartialBy<EvenementPhaseDossierInitializer, "dossier">[]; alertes: Alert[] }
  | undefined {
  const evenementPhaseDossierData: PartialBy<EvenementPhaseDossierInitializer, "dossier">[] = [];

  let alertes: Alert[] = [];

  const normalizedStatutValue = row["Statut"].trim().toLowerCase();
  const dateDebutAccompagnementValue = row[`Date de début d'accompagnement`];

  /** Add an "Accompagnement amont" phase */
  if (
    normalizedStatutValue === "nouveau dossier à venir" ||
    normalizedStatutValue === "diagnostic préalable" ||
    normalizedStatutValue === "demande de compléments dossier"
  ) {
    evenementPhaseDossierData.push({
      phase: "Accompagnement amont",
      timestamp: setYear(new Date(), dateDebutAccompagnementValue),
    });
  }

  /** Add an "Instruction" phase */
  if (
    normalizedStatutValue === `rapport d'instruction` ||
    normalizedStatutValue === "dépôt onagre"
  ) {
    const dateDeReceptionDuDossierCompletValue = row["Date de réception du dossier autoportant"];
    const datePhaseInstruction = dateDeReceptionDuDossierCompletValue.toString();

    if (isValidDateString(datePhaseInstruction)) {
      evenementPhaseDossierData.push({
        phase: "Instruction",
        timestamp: new Date(datePhaseInstruction),
      });
    } else {
      const alertMessage = `La date donnée dans la colonne Date de réception du dossier complet est incorrecte : "${datePhaseInstruction}". On ne peut donc pas rajouter de phase "Instruction" pour ce dossier.`;
      console.warn(alertMessage);
      alertes.push({ message: alertMessage, type: "erreur" });
    }
  }

  return evenementPhaseDossierData.length >= 1
    ? {
        data: evenementPhaseDossierData,
        alertes,
      }
    : undefined;
}

/**
 * Creates a dossier object from an import row.
 */
export async function createDossierFromRow(
  row: DossierCorseRow,
  emailsByInitials: Map<string, string>,
  activitesPrincipales88444: Set<DossierDemarcheNumerique88444["Activité principale"]>,
): Promise<DossierWithAlerts> {
  const { data: localisationsData, alertes: alertesLocalisation } =
    await generateLocalisationsData(row);
  const { data: activitePrincipale, alertes: alertesActivite } =
    convertTypeDeProjetToActivitePrincipale(row, activitesPrincipales88444);

  const autorisationEnvironnementaleData = generateAutorisationEnvironnementaleData(row);

  const demandeurPersonneMoraleResult = getSiretIfDemandeurPersonneMorale(row);

  const demandeurPersonneMoraleData:
    | Pick<
        DossierDemarcheNumerique88444,
        "Le demandeur est…" | "Nom du représentant" | "Numéro de SIRET"
      >
    | undefined = demandeurPersonneMoraleResult?.data
    ? {
        "Le demandeur est…": "une personne morale",
        "Nom du représentant": row["Nom du demandeur"],
        "Numéro de SIRET": demandeurPersonneMoraleResult?.data ?? "",
      }
    : undefined;

  const alertesDemandeurPersonneMorale = demandeurPersonneMoraleResult?.alertes;
  const { alertes: alertesDonneesSupplementaires, ...additionalDataFromRow } =
    createAdditionalDataFromRow(row, emailsByInitials, demandeurPersonneMoraleResult?.data);

  const alertes = [
    ...alertesLocalisation,
    ...alertesActivite,
    ...(alertesDemandeurPersonneMorale ?? []),
    ...alertesDonneesSupplementaires,
  ];

  return {
    "Avez-vous réalisé un état des lieux écologique complet ?": true, // By default, we answer 'Oui' to this question, otherwise the other questions do not show up on DN and the answers are not saved.
    "Des spécimens ou habitats d'espèces protégées sont-ils présents dans l'aire d'influence de votre projet ?": true, // By default, we answer 'Oui' to this question, otherwise the other questions do not show up on DN and the answers are not saved.

    "Le demandeur est…": demandeurPersonneMoraleData
      ? demandeurPersonneMoraleData["Le demandeur est…"]
      : undefined,
    "Nom du représentant": demandeurPersonneMoraleData
      ? demandeurPersonneMoraleData["Nom du représentant"]
      : undefined,
    "Numéro de SIRET": demandeurPersonneMoraleData
      ? demandeurPersonneMoraleData["Numéro de SIRET"]
      : undefined,

    "Nom du projet premettant de l'identifier clairement": createDossierName(row),
    "Activité principale": activitePrincipale,
    "Transport ferroviaire ou électrique - Votre demande concerne :":
      activitePrincipale === "Transport énergie électrique" ? "Autre" : undefined,
    "Dans quel département se localise majoritairement votre projet ?":
      localisationsData["Dans quel département se localise majoritairement votre projet ?"],
    "Commune(s) où se situe le projet": localisationsData["Commune(s) où se situe le projet"],
    "Département(s) où se situe le projet":
      localisationsData["Département(s) où se situe le projet"],
    "Le projet se situe au niveau…": localisationsData["Le projet se situe au niveau…"],
    "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?":
      autorisationEnvironnementaleData[
        "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?"
      ],
    "À quelle procédure le projet est-il soumis ?":
      autorisationEnvironnementaleData["À quelle procédure le projet est-il soumis ?"],
    "NE PAS MODIFIER - Données techniques associées à votre dossier":
      JSON.stringify(additionalDataFromRow),

    alertes,
  };
}

/**
 * Checks whether a specific dossier to import already exists in the database.
 * The lookup compares the project name (the 'name' field of the 'dossier' table)
 * as well as the Onagre number.
 * We use the Onagre number because several projects in the spreadsheet share the same project name (Libellé column).
 */
export function isDossierRowInDatabase(
  row: DossierCorseRow,
  namesInDatabase: Set<string | null>,
  nameToOnagreDemandeIdentifier: Map<string | null, string | null>,
): boolean {
  const name = createDossierName(row);
  const numeroOnagre = row["N°ONAGRE"];
  if (!name || name === "") {
    console.warn(
      `Attention, il n'y a pas de libellé pour le projet de la ligne ${JSON.stringify(row)}`,
    );
    return false;
  }
  if (namesInDatabase.has(name)) {
    return nameToOnagreDemandeIdentifier.get(name) === numeroOnagre;
  } else {
    return false;
  }
}
