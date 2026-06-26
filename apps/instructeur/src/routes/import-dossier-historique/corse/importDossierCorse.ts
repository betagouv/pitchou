import { isDate, setYear } from "date-fns";
import { isValidDateString } from "@pitchou/common/typeFormat.ts";
import {
  formaterDépartementDepuisValeur,
  extraireCommunes,
  getCommuneData,
} from "../importDossierUtils.ts";

import type { DossierDemarcheNumerique88444 } from "@pitchou/types/démarche-numérique/Démarche88444.ts";
import type {
  DonnéesSupplémentairesPourCréationDossier,
  Alerte,
  DossierAvecAlertes,
} from "../importDossierUtils.ts";
import type { DossierComplet } from "@pitchou/types/API_Pitchou.ts";
import type { VNementPhaseDossierInitializer as ÉvènementPhaseDossierInitializer } from "@pitchou/types/database/public/ÉvènementPhaseDossier.ts";
import type { PartialBy } from "@pitchou/types/tools.d.ts";
import type { AvisExpertInitializer } from "@pitchou/types/database/public/AvisExpert.ts";
import type { DCisionAdministrativeInitializer as DécisionAdministrativeInitializer } from "@pitchou/types/database/public/DécisionAdministrative.ts";
import type { PersonneAvecEmailObligatoire } from "@pitchou/types/démarche-numérique/DossierPourSynchronisation.ts";

// D'après le tableau envoyé le 25/07/2025
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
  ["COSICA SOLE", "88802711700017"], // FAUTE DE FRAPPE
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

export function créerNomPourDossier(ligne: LigneDossierCorse): string {
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

const correspondanceTypeDeProjetVersActivitéPrincipale: Map<
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

function convertirTypeDeProjetEnActivitéPrincipale(
  ligne: LigneDossierCorse,
  activitésPrincipales88444: Set<DossierDemarcheNumerique88444["Activité principale"]>,
): { data: DossierDemarcheNumerique88444["Activité principale"]; alertes: Alerte[] } {
  const alertes: Alerte[] = [];
  const typeDeProjet = ligne["Type de projet"].trim();

  // Si le type de projet est déjà une valeur pitchou
  // @ts-ignore
  if (activitésPrincipales88444.has(typeDeProjet)) {
    // ts ne reconnaît pas le type de typeDeProjet
    // @ts-ignore
    return { data: typeDeProjet, alertes };
  }

  const activité = correspondanceTypeDeProjetVersActivitéPrincipale.get(
    typeDeProjet as TypeDeProjetOptions,
  );
  if (activité) {
    return { data: activité, alertes };
  }

  const messageAlerte = `Le type de projet de ce dossier est ${typeDeProjet}. Cette activité n'existe pas dans la liste des Activités Principales de la démarche 88444 (dans Pitchou). On attribue donc l'activité "Autre" à ce projet.`;
  console.warn(messageAlerte);
  alertes.push({ type: "avertissement", message: messageAlerte });

  return { data: "Autre", alertes: alertes };
}

function générerDonnéesAutorisationEnvironnementale(
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

type DonnéesLocalisationsData = Partial<
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

async function générerDonnéesLocalisations(ligne: {
  Commune: string | undefined;
  Département: number | string;
}): Promise<{ data: DonnéesLocalisationsData; alertes: Alerte[] }> {
  const départementParDéfaut = { code: "2A", nom: "Corse-du-Sud" };

  const valeursCommunes = extraireCommunes(ligne["Commune"] ?? "");

  const communesPs = valeursCommunes.map((com) => getCommuneData(com));
  const départementsP = formaterDépartementDepuisValeur(ligne["Département"]);

  const [résultatDépartements, communesResult] = await Promise.all([
    départementsP,
    Promise.all(communesPs),
  ]);

  const communes = communesResult
    .map((communeResult) => communeResult.data)
    .filter((commune) => commune !== null);
  const alertesCommunes = communesResult
    .map((communeResult) => communeResult.alerte)
    .filter((alerte) => alerte !== undefined);
  let alertes = [...alertesCommunes, ...résultatDépartements.alertes];
  const départementsTrouvés = résultatDépartements.data;
  const départementColonne =
    Array.isArray(départementsTrouvés) && départementsTrouvés[0]
      ? départementsTrouvés[0]
      : undefined;

  // @ts-ignore
  let data: DonnéesLocalisationsData = {};

  if (communes.length >= 1) {
    const départementPremièreCommune = communes[0].departement;

    data = {
      "Commune(s) où se situe le projet": communes,
      "Département(s) où se situe le projet": undefined,
      "Le projet se situe au niveau…": "d'une ou plusieurs communes",
      "Dans quel département se localise majoritairement votre projet ?":
        départementColonne ?? départementPremièreCommune,
    };
  } else {
    if (alertesCommunes.length >= 1) {
      alertes.push({
        message: `Au moins une commune a été spécifiée pour cette ligne, mais aucune n'a été trouvée.`,
        type: "erreur",
      });
    }
    const départements = Array.isArray(départementsTrouvés)
      ? départementsTrouvés
      : [départementParDéfaut];
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

function créerDonnéesAvisExpert(
  ligne: LigneDossierCorse,
): PartialBy<AvisExpertInitializer, "dossier">[] | undefined {
  const expert = ligne["Compétence"];
  const avis = ligne["Avis rendu"];
  const date_avis = new Date(ligne["Date avis"].toString());
  const valeurDateDépôtSurOnagre = ligne["Date de dépôt sur ONAGRE"];
  let date_saisine: AvisExpertInitializer["date_saisine"];

  if (isDate(valeurDateDépôtSurOnagre)) {
    date_saisine = new Date(valeurDateDépôtSurOnagre);
  }

  if (expert !== "" || avis !== "") {
    return [{ avis, date_avis, expert, date_saisine }];
  }

  if (date_saisine) {
    return [{ date_saisine }];
  }
}

function créerDonnéesDécisionAdministrative(
  ligne: LigneDossierCorse,
):
  | { data: PartialBy<DécisionAdministrativeInitializer, "dossier">[]; alertes: Alerte[] }
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

function créerDonnéesProchaineActionAttenduePar(
  ligne: LigneDossierCorse,
): DossierComplet["prochaine_action_attendue_par"] | undefined {
  const valeurNiveauDAvancement = ligne["Niveau d'avancement"].trim();

  if (valeurNiveauDAvancement === "A faire") {
    return "Instructeur";
  }

  if (valeurNiveauDAvancement === "En attente") {
    return "Autre";
  }

  return undefined;
}

function créerDonnéeDateDépôt(ligne: LigneDossierCorse): { data: Date; alertes?: Alerte[] } {
  const valeurDateDeDébutDaccompagnement = ligne["Date de début d'accompagnement"];

  if (valeurDateDeDébutDaccompagnement.toString().length === 4) {
    return { data: new Date(valeurDateDeDébutDaccompagnement, 0, 1) };
  } else {
    return {
      data: new Date(),
      alertes: [
        {
          type: "avertissement",
          message: `L'année renseignée dans la colonne "Date de début d'accompagnement" est incorrecte et égale à "${valeurDateDeDébutDaccompagnement}". On ne peut donc pas renseigner la date de première sollicitation qui sera par défaut la date d'aujourd'hui.`,
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

function créerDonnéePersonnesQuiSuivent(
  ligne: LigneDossierCorse,
  emailsParInitials: Map<string, string>,
): PersonneAvecEmailObligatoire[] | undefined {
  const valeurInstructeurDREAL = ligne["Instructeur DREAL"];
  const valeurDépartement = ligne["Département"];

  const instructricesTrouvées = valeurInstructeurDREAL.replaceAll(" ", "").split("+");

  let personnesQuiSuivent: PersonneAvecEmailObligatoire[] = [];

  for (const instructriceTrouvée of instructricesTrouvées) {
    if (["BG", "MR", "MB"].includes(instructriceTrouvée)) {
      if (valeurDépartement === "2A") {
        personnesQuiSuivent.push({ email: emailsParInitials.get("CT") ?? "" });
      } else if (valeurDépartement === "2B") {
        personnesQuiSuivent.push({ email: emailsParInitials.get("PZ") ?? "" });
      }
    }

    const emailTrouvé = emailsParInitials.get(instructriceTrouvée);

    if (
      emailTrouvé &&
      !personnesQuiSuivent.find((personneQuiSuit) => personneQuiSuit.email === emailTrouvé)
    ) {
      personnesQuiSuivent.push({ email: emailTrouvé });
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
 * Extrait les données supplémentaires (NE PAS MODIFIER) depuis une ligne d'import.
 */
function créerDonnéesSupplémentairesDepuisLigne(
  ligne: LigneDossierCorse,
  emailsParInitials: Map<string, string>,
  demandeurPersonneMorale?: string,
): DonnéesSupplémentairesPourCréationDossier & { alertes: Alerte[] } {
  const résultatsDonnéesEvénementPhaseDossier = créerDonnéesEvénementPhaseDossier(ligne);

  const avisExpert = créerDonnéesAvisExpert(ligne);

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

  const résultatsDécisionAdministrative = créerDonnéesDécisionAdministrative(ligne);

  const dateDébutConsultation = isValidDateString(ligne["Début consultation"])
    ? new Date(ligne["Début consultation"])
    : undefined;
  const dateFinConsultation = isValidDateString(ligne["Fin de publication"])
    ? new Date(ligne["Fin de publication"])
    : undefined;

  const prochaineActionAttenduePar = créerDonnéesProchaineActionAttenduePar(ligne);

  const résultatDateDépôt = créerDonnéeDateDépôt(ligne);

  const dateDépôt = résultatDateDépôt?.data;

  const personnesQuiSuivent = créerDonnéePersonnesQuiSuivent(ligne, emailsParInitials);

  const alertes = [
    ...(résultatsDonnéesEvénementPhaseDossier?.alertes ?? []),
    ...(résultatsDécisionAdministrative?.alertes ?? []),
    ...(résultatDateDépôt?.alertes ?? []),
  ];

  return {
    dossier: {
      historique_identifiant_demande_onagre: ligne["N°ONAGRE"],
      date_dépôt: dateDépôt,
      commentaire_libre: commentaire_libre,
      date_debut_consultation_public: dateDébutConsultation,
      date_fin_consultation_public: dateFinConsultation,
      prochaine_action_attendue_par: prochaineActionAttenduePar,
      // @ts-ignore
      demandeur_personne_morale: demandeurPersonneMorale,
    },
    évènement_phase_dossier: résultatsDonnéesEvénementPhaseDossier?.data,
    alertes,
    avis_expert: avisExpert,
    décision_administrative: résultatsDécisionAdministrative?.data,
    personnes_qui_suivent: personnesQuiSuivent,
  };
}

/**
 *
 */
function créerDonnéesEvénementPhaseDossier(
  ligne: LigneDossierCorse,
):
  | { data: PartialBy<ÉvènementPhaseDossierInitializer, "dossier">[]; alertes: Alerte[] }
  | undefined {
  const donnéesEvénementPhaseDossier: PartialBy<ÉvènementPhaseDossierInitializer, "dossier">[] = [];

  let alertes: Alerte[] = [];

  const valeurNormaliséeStatut = ligne["Statut"].trim().toLowerCase();
  const valeurDateDébutAccompagnement = ligne[`Date de début d'accompagnement`];

  /** Ajout d'une phase Accompagnement amont */
  if (
    valeurNormaliséeStatut === "nouveau dossier à venir" ||
    valeurNormaliséeStatut === "diagnostic préalable" ||
    valeurNormaliséeStatut === "demande de compléments dossier"
  ) {
    donnéesEvénementPhaseDossier.push({
      phase: "Accompagnement amont",
      horodatage: setYear(new Date(), valeurDateDébutAccompagnement),
    });
  }

  /** Ajout d'une phase Instruction */
  if (
    valeurNormaliséeStatut === `rapport d'instruction` ||
    valeurNormaliséeStatut === "dépôt onagre"
  ) {
    const valeurDateDeRéceptionDuDossierComplet = ligne["Date de réception du dossier autoportant"];
    const datePhaseInstruction = valeurDateDeRéceptionDuDossierComplet.toString();

    if (isValidDateString(datePhaseInstruction)) {
      donnéesEvénementPhaseDossier.push({
        phase: "Instruction",
        horodatage: new Date(datePhaseInstruction),
      });
    } else {
      const messageAlerte = `La date donnée dans la colonne Date de réception du dossier complet est incorrecte : "${datePhaseInstruction}". On ne peut donc pas rajouter de phase "Instruction" pour ce dossier.`;
      console.warn(messageAlerte);
      alertes.push({ message: messageAlerte, type: "erreur" });
    }
  }

  return donnéesEvénementPhaseDossier.length >= 1
    ? {
        data: donnéesEvénementPhaseDossier,
        alertes,
      }
    : undefined;
}

/**
 * Crée un objet dossier à partir d'une ligne d'import.
 */
export async function créerDossierDepuisLigne(
  ligne: LigneDossierCorse,
  emailsParInitials: Map<string, string>,
  activitésPrincipales88444: Set<DossierDemarcheNumerique88444["Activité principale"]>,
): Promise<DossierAvecAlertes> {
  const { data: donnéesLocalisations, alertes: alertesLocalisation } =
    await générerDonnéesLocalisations(ligne);
  const { data: activitéPrincipale, alertes: alertesActivité } =
    convertirTypeDeProjetEnActivitéPrincipale(ligne, activitésPrincipales88444);

  const donnéesAutorisationEnvironnementale = générerDonnéesAutorisationEnvironnementale(ligne);

  const résultatDemandeurPersonneMorale = getSiretSiDemandeurPersonneMorale(ligne);

  const donnéesDemandeurPersonneMorale:
    | Pick<
        DossierDemarcheNumerique88444,
        "Le demandeur est…" | "Nom du représentant" | "Numéro de SIRET"
      >
    | undefined = résultatDemandeurPersonneMorale?.data
    ? {
        "Le demandeur est…": "une personne morale",
        "Nom du représentant": ligne["Nom du demandeur"],
        "Numéro de SIRET": résultatDemandeurPersonneMorale?.data ?? "",
      }
    : undefined;

  const alertesDemandeurPersonneMorale = résultatDemandeurPersonneMorale?.alertes;
  const { alertes: alertesDonnéesSupplémentaires, ...donnéesSupplémentairesDepuisLigne } =
    créerDonnéesSupplémentairesDepuisLigne(
      ligne,
      emailsParInitials,
      résultatDemandeurPersonneMorale?.data,
    );

  const alertes = [
    ...alertesLocalisation,
    ...alertesActivité,
    ...(alertesDemandeurPersonneMorale ?? []),
    ...alertesDonnéesSupplémentaires,
  ];

  return {
    "Avez-vous réalisé un état des lieux écologique complet ?": true, // Par défaut, on répond 'Oui' à cette question sinon les autres questions ne s'affichent pas sur DN et les réponses ne sont pas sauvegardées.
    "Des spécimens ou habitats d'espèces protégées sont-ils présents dans l'aire d'influence de votre projet ?": true, // Par défaut, on répond 'Oui' à cette question sinon les autres questions ne s'affichent pas sur DN et les réponses ne sont pas sauvegardées.

    "Le demandeur est…": donnéesDemandeurPersonneMorale
      ? donnéesDemandeurPersonneMorale["Le demandeur est…"]
      : undefined,
    "Nom du représentant": donnéesDemandeurPersonneMorale
      ? donnéesDemandeurPersonneMorale["Nom du représentant"]
      : undefined,
    "Numéro de SIRET": donnéesDemandeurPersonneMorale
      ? donnéesDemandeurPersonneMorale["Numéro de SIRET"]
      : undefined,

    "Nom du projet premettant de l'identifier clairement": créerNomPourDossier(ligne),
    "Activité principale": activitéPrincipale,
    "Transport ferroviaire ou électrique - Votre demande concerne :":
      activitéPrincipale === "Transport énergie électrique" ? "Autre" : undefined,
    "Dans quel département se localise majoritairement votre projet ?":
      donnéesLocalisations["Dans quel département se localise majoritairement votre projet ?"],
    "Commune(s) où se situe le projet": donnéesLocalisations["Commune(s) où se situe le projet"],
    "Département(s) où se situe le projet":
      donnéesLocalisations["Département(s) où se situe le projet"],
    "Le projet se situe au niveau…": donnéesLocalisations["Le projet se situe au niveau…"],
    "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?":
      donnéesAutorisationEnvironnementale[
        "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?"
      ],
    "À quelle procédure le projet est-il soumis ?":
      donnéesAutorisationEnvironnementale["À quelle procédure le projet est-il soumis ?"],
    "NE PAS MODIFIER - Données techniques associées à votre dossier": JSON.stringify(
      donnéesSupplémentairesDepuisLigne,
    ),

    alertes,
  };
}

/**
 * Vérifie si un dossier spécifique à importer existe déjà dans la base de données.
 * La recherche s'effectue en comparant le nom du projet (champ 'nom' de la table 'dossier')
 * ainsi que le numéro Onagre.
 * On utilise le numéro Onagre car plusieurs projets du tableau possèdent le même nom de projet (colonne Libellé).
 */
export function ligneDossierEnBDD(
  ligne: LigneDossierCorse,
  nomsEnBDD: Set<string | null>,
  nomToHistoriqueIdentifiantDemandeOnagre: Map<string | null, string | null>,
): boolean {
  const nom = créerNomPourDossier(ligne);
  const numéroOnagre = ligne["N°ONAGRE"];
  if (!nom || nom === "") {
    console.warn(
      `Attention, il n'y a pas de libellé pour le projet de la ligne ${JSON.stringify(ligne)}`,
    );
    return false;
  }
  if (nomsEnBDD.has(nom)) {
    return nomToHistoriqueIdentifiantDemandeOnagre.get(nom) === numéroOnagre;
  } else {
    return false;
  }
}
