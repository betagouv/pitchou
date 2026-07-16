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
  Alerte,
  DossierAvecAlertes,
} from "../importDossierUtils.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { EvenementPhaseDossierInitializer as EvenementPhaseDossierInitializer } from "@pitchou/types/database/public/EvenementPhaseDossier.ts";
import type { PartialBy } from "@pitchou/types/tools.d.ts";
import type { AvisExpertInitializer } from "@pitchou/types/database/public/AvisExpert.ts";
import type { DecisionAdministrativeInitializer as DecisionAdministrativeInitializer } from "@pitchou/types/database/public/DecisionAdministrative.ts";
import type { PersonneWithRequiredEmail } from "@pitchou/types/demarche-numerique/DossierPourSynchronisation.ts";

// Based on the spreadsheet sent on 25/07/2025
export type LigneDossierCorse = {
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

export function creerNomPourDossier(ligne: LigneDossierCorse): string {
  return ligne["Libellé Projet"];
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

const correspondanceTypeDeProjetVersActivitePrincipale: Map<
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

function convertirTypeDeProjetEnActivitePrincipale(
  ligne: LigneDossierCorse,
  activitesPrincipales88444: Set<DossierDemarcheNumerique88444["Activité principale"]>,
): { data: DossierDemarcheNumerique88444["Activité principale"]; alertes: Alerte[] } {
  const alertes: Alerte[] = [];
  const typeDeProjet = ligne["Type de projet"].trim();

  // If the project type is already a pitchou value
  // @ts-ignore
  if (activitesPrincipales88444.has(typeDeProjet)) {
    // ts does not recognize the type of typeDeProjet
    // @ts-ignore
    return { data: typeDeProjet, alertes };
  }

  const activite = correspondanceTypeDeProjetVersActivitePrincipale.get(
    typeDeProjet as TypeDeProjetOptions,
  );
  if (activite) {
    return { data: activite, alertes };
  }

  const messageAlerte = `Le type de projet de ce dossier est ${typeDeProjet}. Cette activité n'existe pas dans la liste des Activités Principales de la démarche 88444 (dans Pitchou). On attribue donc l'activité "Autre" à ce projet.`;
  console.warn(messageAlerte);
  alertes.push({ type: "avertissement", message: messageAlerte });

  return { data: "Autre", alertes: alertes };
}

function genererDonneesAutorisationEnvironnementale(
  ligne: LigneDossierCorse,
): Pick<
  DossierDemarcheNumerique88444,
  | "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?"
  | "À quelle procédure le projet est-il soumis ?"
> {
  const type_de_projet = ligne["Type de projet"].toLowerCase();

  const valeurServicePilote = ligne["Service Pilote"].trim().toUpperCase();

  if (type_de_projet.includes("icpe")) {
    return {
      "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?":
        "Oui",
      "À quelle procédure le projet est-il soumis ?": ["Autorisation ICPE"],
    };
  }

  if (valeurServicePilote === "SBEP") {
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

type DonneesLocalisationsData = Partial<
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

async function genererDonneesLocalisations(ligne: {
  Commune: string | undefined;
  Département: number | string;
}): Promise<{ data: DonneesLocalisationsData; alertes: Alerte[] }> {
  const departementParDefaut = { code: "2A", nom: "Corse-du-Sud" };

  const valeursCommunes = extractCommunes(ligne["Commune"] ?? "");

  const communesPs = valeursCommunes.map((com) => getCommuneData(com));
  const departementsP = formatDepartementFromValue(ligne["Département"]);

  const [resultatDepartements, communesResult] = await Promise.all([
    departementsP,
    Promise.all(communesPs),
  ]);

  const communes = communesResult
    .map((communeResult) => communeResult.data)
    .filter((commune) => commune !== null);
  const alertesCommunes = communesResult
    .map((communeResult) => communeResult.alerte)
    .filter((alerte) => alerte !== undefined);
  let alertes = [...alertesCommunes, ...resultatDepartements.alertes];
  const departementsTrouves = resultatDepartements.data;
  const departementColonne =
    Array.isArray(departementsTrouves) && departementsTrouves[0]
      ? departementsTrouves[0]
      : undefined;

  // @ts-ignore
  let data: DonneesLocalisationsData = {};

  if (communes.length >= 1) {
    const departementPremiereCommune = communes[0].departement;

    data = {
      "Commune(s) où se situe le projet": communes,
      "Département(s) où se situe le projet": undefined,
      "Le projet se situe au niveau…": "d'une ou plusieurs communes",
      "Dans quel département se localise majoritairement votre projet ?":
        departementColonne ?? departementPremiereCommune,
    };
  } else {
    if (alertesCommunes.length >= 1) {
      alertes.push({
        message: `Au moins une commune a été spécifiée pour cette ligne, mais aucune n'a été trouvée.`,
        type: "erreur",
      });
    }
    const départements = Array.isArray(departementsTrouves)
      ? departementsTrouves
      : [departementParDefaut];
    data = {
      "Commune(s) où se situe le projet": undefined,
      "Département(s) où se situe le projet": départements,
      "Le projet se situe au niveau…": "d'un ou plusieurs départements",
      "Dans quel département se localise majoritairement votre projet ?": départements[0],
    };
  }

  return {
    alertes,
    data,
  };
}

function creerDonneesAvisExpert(
  ligne: LigneDossierCorse,
): PartialBy<AvisExpertInitializer, "dossier">[] | undefined {
  const expert = ligne["Compétence"];
  const avis = ligne["Avis rendu"];
  const date_avis = new Date(ligne["Date avis"].toString());
  const valeurDateDepotSurOnagre = ligne["Date de dépôt sur ONAGRE"];
  let date_saisine: AvisExpertInitializer["date_saisine"];

  if (isDate(valeurDateDepotSurOnagre)) {
    date_saisine = new Date(valeurDateDepotSurOnagre);
  }

  if (expert !== "" || avis !== "") {
    return [{ avis, date_avis, expert, date_saisine }];
  }

  if (date_saisine) {
    return [{ date_saisine }];
  }
}

function creerDonneesDecisionAdministrative(
  ligne: LigneDossierCorse,
):
  | { data: PartialBy<DecisionAdministrativeInitializer, "dossier">[]; alertes: Alerte[] }
  | undefined {
  const valeurDateAP = ligne["Date AP"];

  if (!(!valeurDateAP || (typeof valeurDateAP === "string" && valeurDateAP === ""))) {
    if (isValidDateString(valeurDateAP.toString())) {
      return {
        data: [
          {
            date_signature: new Date(valeurDateAP),
            type: "Autre décision",
            numéro: ligne["Numéro AP"],
          },
        ],
        alertes: [],
      };
    } else {
      const message = `La date indiquée dans la colonne Date AP est incorrecte : ${valeurDateAP}. On n'importe donc pas de décision administrative.`;
      return { alertes: [{ message, type: "erreur" }], data: [] };
    }
  }
}

function creerDonneesProchaineActionAttenduePar(
  ligne: LigneDossierCorse,
): DossierFull["prochaine_action_attendue_par"] | undefined {
  const valeurNiveauDAvancement = ligne["Niveau d'avancement"].trim();

  if (valeurNiveauDAvancement === "A faire") {
    return "Instructeur";
  }

  if (valeurNiveauDAvancement === "En attente") {
    return "Autre";
  }

  return undefined;
}

function creerDonneeDateDepot(ligne: LigneDossierCorse): { data: Date; alertes?: Alerte[] } {
  const valeurDateDeDebutDaccompagnement = ligne["Date de début d'accompagnement"];

  if (valeurDateDeDebutDaccompagnement.toString().length === 4) {
    return { data: new Date(valeurDateDeDebutDaccompagnement, 0, 1) };
  } else {
    return {
      data: new Date(),
      alertes: [
        {
          type: "avertissement",
          message: `L'année renseignée dans la colonne "Date de début d'accompagnement" est incorrecte et égale à "${valeurDateDeDebutDaccompagnement}". On ne peut donc pas renseigner la date de première sollicitation qui sera par défaut la date d'aujourd'hui.`,
        },
      ],
    };
  }
}

function getSiretSiDemandeurPersonneMorale(
  ligne: LigneDossierCorse,
): { data?: string; alertes?: Alerte[] } | undefined {
  const valeurNomDuDemandeur = ligne["Nom du demandeur"].trim().toUpperCase();
  const siret = demandeurToSiret.get(valeurNomDuDemandeur);
  if (!siret && valeurNomDuDemandeur !== "") {
    return {
      alertes: [
        {
          type: "avertissement",
          message: `La colonne "Nom du demandeur" a pour valeur "${valeurNomDuDemandeur} mais aucun siret correspondant n'a été trouvé."`,
        },
      ],
    };
  }

  if (siret) {
    return { data: siret };
  }
}

function creerDonneePersonnesQuiSuivent(
  ligne: LigneDossierCorse,
  emailsParInitials: Map<string, string>,
): PersonneWithRequiredEmail[] | undefined {
  const valeurInstructeurDREAL = ligne["Instructeur DREAL"];
  const valeurDepartement = ligne["Département"];

  const instructricesTrouvees = valeurInstructeurDREAL.replaceAll(" ", "").split("+");

  let personnesQuiSuivent: PersonneWithRequiredEmail[] = [];

  for (const instructriceTrouvee of instructricesTrouvees) {
    if (["BG", "MR", "MB"].includes(instructriceTrouvee)) {
      if (valeurDepartement === "2A") {
        personnesQuiSuivent.push({ email: emailsParInitials.get("CT") ?? "" });
      } else if (valeurDepartement === "2B") {
        personnesQuiSuivent.push({ email: emailsParInitials.get("PZ") ?? "" });
      }
    }

    const emailTrouve = emailsParInitials.get(instructriceTrouvee);

    if (
      emailTrouve &&
      !personnesQuiSuivent.find((personneQuiSuit) => personneQuiSuit.email === emailTrouve)
    ) {
      personnesQuiSuivent.push({ email: emailTrouve });
    }
  }

  if (personnesQuiSuivent.length >= 1) {
    return personnesQuiSuivent;
  }
}

type SousCommentaireDansCommentaireLibre = {
  titre: string;
  commentaire: string | undefined;
};

/**
 * Extracts the additional data (NE PAS MODIFIER) from an import row.
 */
function creerDonneesSupplementairesDepuisLigne(
  ligne: LigneDossierCorse,
  emailsParInitials: Map<string, string>,
  demandeurPersonneMorale?: string,
): AdditionalDataForDossierCreation & { alertes: Alerte[] } {
  const resultatsDonneesEvenementPhaseDossier = creerDonneesEvenementPhaseDossier(ligne);

  const avisExpert = creerDonneesAvisExpert(ligne);

  const commentairePhaseInstruction: SousCommentaireDansCommentaireLibre = {
    titre: "Commentaire phase instruction",
    commentaire: ligne["Commentaires phase instruction"],
  };
  const commentairePostAP: SousCommentaireDansCommentaireLibre = {
    titre: "Commentaires post AP",
    commentaire: ligne["Commentaires post AP"],
  };
  const commentaireRemarques: SousCommentaireDansCommentaireLibre = {
    titre: "Remarques",
    commentaire: ligne["Remarques"],
  };
  const commentaireContribution: SousCommentaireDansCommentaireLibre = {
    titre: "Contribution",
    commentaire: ligne["Contribution"],
  };

  const commentaire_libre = [
    commentairePhaseInstruction,
    commentairePostAP,
    commentaireRemarques,
    commentaireContribution,
  ]
    .filter((value) => value?.commentaire?.trim())
    .map(({ titre, commentaire }) => `${titre} : ${commentaire}`)
    .join("\n");

  const resultatsDecisionAdministrative = creerDonneesDecisionAdministrative(ligne);

  const dateDebutConsultation = isValidDateString(ligne["Début consultation"])
    ? new Date(ligne["Début consultation"])
    : undefined;
  const dateFinConsultation = isValidDateString(ligne["Fin de publication"])
    ? new Date(ligne["Fin de publication"])
    : undefined;

  const prochaineActionAttenduePar = creerDonneesProchaineActionAttenduePar(ligne);

  const resultatDateDepot = creerDonneeDateDepot(ligne);

  const dateDepot = resultatDateDepot?.data;

  const personnesQuiSuivent = creerDonneePersonnesQuiSuivent(ligne, emailsParInitials);

  const alertes = [
    ...(resultatsDonneesEvenementPhaseDossier?.alertes ?? []),
    ...(resultatsDecisionAdministrative?.alertes ?? []),
    ...(resultatDateDepot?.alertes ?? []),
  ];

  return {
    dossier: {
      historique_identifiant_demande_onagre: ligne["N°ONAGRE"],
      date_dépôt: dateDepot,
      commentaire_libre: commentaire_libre,
      date_debut_consultation_public: dateDebutConsultation,
      date_fin_consultation_public: dateFinConsultation,
      prochaine_action_attendue_par: prochaineActionAttenduePar,
      // @ts-ignore
      demandeur_personne_morale: demandeurPersonneMorale,
    },
    évènement_phase_dossier: resultatsDonneesEvenementPhaseDossier?.data,
    alertes,
    avis_expert: avisExpert,
    décision_administrative: resultatsDecisionAdministrative?.data,
    personnes_qui_suivent: personnesQuiSuivent,
  };
}

/**
 *
 */
function creerDonneesEvenementPhaseDossier(
  ligne: LigneDossierCorse,
):
  | { data: PartialBy<EvenementPhaseDossierInitializer, "dossier">[]; alertes: Alerte[] }
  | undefined {
  const donneesEvenementPhaseDossier: PartialBy<EvenementPhaseDossierInitializer, "dossier">[] = [];

  let alertes: Alerte[] = [];

  const valeurNormaliseeStatut = ligne["Statut"].trim().toLowerCase();
  const valeurDateDebutAccompagnement = ligne[`Date de début d'accompagnement`];

  /** Add an "Accompagnement amont" phase */
  if (
    valeurNormaliseeStatut === "nouveau dossier à venir" ||
    valeurNormaliseeStatut === "diagnostic préalable" ||
    valeurNormaliseeStatut === "demande de compléments dossier"
  ) {
    donneesEvenementPhaseDossier.push({
      phase: "Accompagnement amont",
      horodatage: setYear(new Date(), valeurDateDebutAccompagnement),
    });
  }

  /** Add an "Instruction" phase */
  if (
    valeurNormaliseeStatut === `rapport d'instruction` ||
    valeurNormaliseeStatut === "dépôt onagre"
  ) {
    const valeurDateDeReceptionDuDossierComplet = ligne["Date de réception du dossier autoportant"];
    const datePhaseInstruction = valeurDateDeReceptionDuDossierComplet.toString();

    if (isValidDateString(datePhaseInstruction)) {
      donneesEvenementPhaseDossier.push({
        phase: "Instruction",
        horodatage: new Date(datePhaseInstruction),
      });
    } else {
      const messageAlerte = `La date donnée dans la colonne Date de réception du dossier complet est incorrecte : "${datePhaseInstruction}". On ne peut donc pas rajouter de phase "Instruction" pour ce dossier.`;
      console.warn(messageAlerte);
      alertes.push({ message: messageAlerte, type: "erreur" });
    }
  }

  return donneesEvenementPhaseDossier.length >= 1
    ? {
        data: donneesEvenementPhaseDossier,
        alertes,
      }
    : undefined;
}

/**
 * Creates a dossier object from an import row.
 */
export async function creerDossierDepuisLigne(
  ligne: LigneDossierCorse,
  emailsParInitials: Map<string, string>,
  activitesPrincipales88444: Set<DossierDemarcheNumerique88444["Activité principale"]>,
): Promise<DossierAvecAlertes> {
  const { data: donneesLocalisations, alertes: alertesLocalisation } =
    await genererDonneesLocalisations(ligne);
  const { data: activitePrincipale, alertes: alertesActivite } =
    convertirTypeDeProjetEnActivitePrincipale(ligne, activitesPrincipales88444);

  const donneesAutorisationEnvironnementale = genererDonneesAutorisationEnvironnementale(ligne);

  const resultatDemandeurPersonneMorale = getSiretSiDemandeurPersonneMorale(ligne);

  const donneesDemandeurPersonneMorale:
    | Pick<
        DossierDemarcheNumerique88444,
        "Le demandeur est…" | "Nom du représentant" | "Numéro de SIRET"
      >
    | undefined = resultatDemandeurPersonneMorale?.data
    ? {
        "Le demandeur est…": "une personne morale",
        "Nom du représentant": ligne["Nom du demandeur"],
        "Numéro de SIRET": resultatDemandeurPersonneMorale?.data ?? "",
      }
    : undefined;

  const alertesDemandeurPersonneMorale = resultatDemandeurPersonneMorale?.alertes;
  const { alertes: alertesDonneesSupplementaires, ...donneesSupplementairesDepuisLigne } =
    creerDonneesSupplementairesDepuisLigne(
      ligne,
      emailsParInitials,
      resultatDemandeurPersonneMorale?.data,
    );

  const alertes = [
    ...alertesLocalisation,
    ...alertesActivite,
    ...(alertesDemandeurPersonneMorale ?? []),
    ...alertesDonneesSupplementaires,
  ];

  return {
    "Avez-vous réalisé un état des lieux écologique complet ?": true, // By default, we answer 'Oui' to this question, otherwise the other questions do not show up on DN and the answers are not saved.
    "Des spécimens ou habitats d'espèces protégées sont-ils présents dans l'aire d'influence de votre projet ?": true, // By default, we answer 'Oui' to this question, otherwise the other questions do not show up on DN and the answers are not saved.

    "Le demandeur est…": donneesDemandeurPersonneMorale
      ? donneesDemandeurPersonneMorale["Le demandeur est…"]
      : undefined,
    "Nom du représentant": donneesDemandeurPersonneMorale
      ? donneesDemandeurPersonneMorale["Nom du représentant"]
      : undefined,
    "Numéro de SIRET": donneesDemandeurPersonneMorale
      ? donneesDemandeurPersonneMorale["Numéro de SIRET"]
      : undefined,

    "Nom du projet premettant de l'identifier clairement": creerNomPourDossier(ligne),
    "Activité principale": activitePrincipale,
    "Transport ferroviaire ou électrique - Votre demande concerne :":
      activitePrincipale === "Transport énergie électrique" ? "Autre" : undefined,
    "Dans quel département se localise majoritairement votre projet ?":
      donneesLocalisations["Dans quel département se localise majoritairement votre projet ?"],
    "Commune(s) où se situe le projet": donneesLocalisations["Commune(s) où se situe le projet"],
    "Département(s) où se situe le projet":
      donneesLocalisations["Département(s) où se situe le projet"],
    "Le projet se situe au niveau…": donneesLocalisations["Le projet se situe au niveau…"],
    "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?":
      donneesAutorisationEnvironnementale[
        "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?"
      ],
    "À quelle procédure le projet est-il soumis ?":
      donneesAutorisationEnvironnementale["À quelle procédure le projet est-il soumis ?"],
    "NE PAS MODIFIER - Données techniques associées à votre dossier": JSON.stringify(
      donneesSupplementairesDepuisLigne,
    ),

    alertes,
  };
}

/**
 * Checks whether a specific dossier to import already exists in the database.
 * The lookup compares the project name (the 'nom' field of the 'dossier' table)
 * as well as the Onagre number.
 * We use the Onagre number because several projects in the spreadsheet share the same project name (Libellé column).
 */
export function ligneDossierEnBDD(
  ligne: LigneDossierCorse,
  nomsEnBDD: Set<string | null>,
  nomToHistoriqueIdentifiantDemandeOnagre: Map<string | null, string | null>,
): boolean {
  const nom = creerNomPourDossier(ligne);
  const numeroOnagre = ligne["N°ONAGRE"];
  if (!nom || nom === "") {
    console.warn(
      `Attention, il n'y a pas de libellé pour le projet de la ligne ${JSON.stringify(ligne)}`,
    );
    return false;
  }
  if (nomsEnBDD.has(nom)) {
    return nomToHistoriqueIdentifiantDemandeOnagre.get(nom) === numeroOnagre;
  } else {
    return false;
  }
}
