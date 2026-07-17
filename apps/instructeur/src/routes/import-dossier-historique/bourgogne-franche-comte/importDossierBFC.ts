import { addMonths } from "date-fns";
import { isValidDateString } from "@pitchou/common/typeFormat.ts";
import {
  extractFirstMail,
  extractNom,
  extractNomFromMail,
  formatDepartementFromValue,
  extractCommunes,
  getCommuneData,
} from "../importDossierUtils.ts";

import type { AdditionalDataForDossierCreation } from "../importDossierUtils.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type { PartialBy } from "@pitchou/types/tools.d.ts";
import type { EvenementPhaseDossierInitializer as EvenementPhaseDossierInitializer } from "@pitchou/types/database/public/EvenementPhaseDossier.ts";
import type { DecisionAdministrativeInitializer as DecisionAdministrativeInitializer } from "@pitchou/types/database/public/DecisionAdministrative.ts";
import type { AvisExpertInitializer } from "@pitchou/types/database/public/AvisExpert.ts";

export type DossierBFCRow = {
  "Date de sollicitation": Date;
  ORIGINE: string;
  OBJET: string;
  "N° Dossier DEROG": number;
  ÉCHÉANCE: string;
  "POUR\nATTRIBUTION": string;
  OBSERVATIONS: string;
  PETITIONNAIRE: string;
  "Catégorie du demandeur": string;
  "Nom contact – mail": string;
  "Année de première sollicitation": number;
  Communes: string;
  Département: number | string;
  Thématique: string;
  "Procédure associée": string;
  "Etapes du projet": string;
  "Stade de l’avis": string;
  "Description avancement dossier avec dates": string;
  "Avis SBEP": string;
  "Date de rendu de l’avis/envoi réponse": Date;
  "Sollicitation OFB pour avis": string;
  DEP: string;
  "Date de dépôt DEP": string;
  "Saisine CSRPN/CNPN": string;
  "Date saisine CSRPN/CNPN": string;
  "Nom de l’expert désigné (pour le CSRPN)": string;
  "N° de l’avis Onagre ou interne": string;
  "Avis CSRPN/CNPN": string;
  "Date avis CSRPN/CNPN": string;
  "Dérogation accordée": string;
  "Date AP": string;
};

type ThematiquesOptions =
  | "Autres"
  | "Autres EnR"
  | "Avis sur document d’urbanisme"
  | "Bâti (espèces anthropophiles)"
  | "Carrières"
  | "Dommages liés aux EP"
  | "Dessertes forestières"
  | "Éolien"
  | "Infrastructures linéaires"
  | "Inventaires, recherche scientifique"
  | "Manifestations sportives et culturelles"
  | "Naturalisation"
  | "Ouvrages cours d’eau"
  | "PPV"
  | "Projet agricole"
  | "Projet d’aménagement"
  | "Restauration"
  | "Transport de spécimens";

const thematiqueToActivitePrincipale: Map<
  ThematiquesOptions,
  DossierDemarcheNumerique88444["Activité principale"]
> = new Map([
  ["Autres", "Autre"],
  ["Autres EnR", "Production énergie renouvelable - Méthaniseur, biomasse"],
  [
    "Avis sur document d’urbanisme",
    "Urbanisation logement (déclaration préalable travaux, PC, permis d’aménager)",
  ],
  [
    "Bâti (espèces anthropophiles)",
    "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d’art",
  ],
  ["Carrières", "Carrières"],
  ["Dommages liés aux EP", "Dommages aux biens et activités"],
  ["Dessertes forestières", "Exploitation forestière"],
  ["Éolien", "Production énergie renouvelable - Éolien"],
  ["Inventaires, recherche scientifique", "Demande à caractère scientifique"],
  ["Manifestations sportives et culturelles", "Événementiel avec ou sans aménagement temporaire"],
  ["Naturalisation", "Pédagogique enseignement"],
  ["Ouvrages cours d’eau", "Projets liés à la gestion de l’eau"],
  ["PPV", "Production énergie renouvelable - Photovoltaïque"],
  ["Projet agricole", "Installations agricoles"],
  [
    "Projet d’aménagement",
    "Urbanisation logement (déclaration préalable travaux, PC, permis d’aménager)",
  ],
  ["Restauration", "Restauration écologique"],
  ["Transport de spécimens", "Production énergie renouvelable - Éolien -  Suivi mortalité"],
]);

function convertThematiqueToActivitePrincipale(
  thematiqueBFC: string,
  activitesPrincipales88444: Set<DossierDemarcheNumerique88444["Activité principale"]>,
): DossierDemarcheNumerique88444["Activité principale"] {
  // If the thématique is already a pitchou value
  // @ts-ignore
  if (activitesPrincipales88444.has(thematiqueBFC)) {
    // @ts-ignore
    return thematiqueBFC;
  }

  const activite = thematiqueToActivitePrincipale.get(thematiqueBFC as ThematiquesOptions);
  if (activite) {
    return activite;
  }

  console.warn("Thématique BFC non associée à une activité Pitchou", thematiqueBFC);

  return "Autre";
}

export function createNomForDossier(row: DossierBFCRow): string {
  return "N° Dossier DEROG " + row["N° Dossier DEROG"] + " - " + row["OBJET"];
}

/**
 * Creates a dossier object from an import row (includes looking up localisation data).
 */
export async function createDossierFromRow(
  row: DossierBFCRow,
  activitesPrincipales88444: Set<DossierDemarcheNumerique88444["Activité principale"]>,
): Promise<Partial<DossierDemarcheNumerique88444>> {
  const localisationsData = await generateLocalisationsData(row);
  const demandeursData = generateDemandeursData(row);
  const autorisationEnvironnementaleData = generateAutorisationEnvironnementaleData(row);

  return {
    "NE PAS MODIFIER - Données techniques associées à votre dossier": JSON.stringify(
      createAdditionalDataFromRow(row),
    ),

    "Nom du projet premettant de l'identifier clairement": createNomForDossier(row),
    "Dans quel département se localise majoritairement votre projet ?":
      localisationsData["Dans quel département se localise majoritairement votre projet ?"],
    "Avez-vous réalisé un état des lieux écologique complet ?": true, // By default, we answer 'Yes' to this question otherwise the other questions don't show up on DS and the answers are not saved.

    "Commune(s) où se situe le projet": localisationsData["Commune(s) où se situe le projet"],
    "Le projet se situe au niveau…": localisationsData["Le projet se situe au niveau…"],
    "Département(s) où se situe le projet":
      localisationsData["Département(s) où se situe le projet"],
    "Activité principale": convertThematiqueToActivitePrincipale(
      row["Thématique"],
      activitesPrincipales88444,
    ),
    "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?":
      autorisationEnvironnementaleData[
        "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?"
      ],
    "À quelle procédure le projet est-il soumis ?":
      autorisationEnvironnementaleData["À quelle procédure le projet est-il soumis ?"],
    "Le demandeur est…": demandeursData["Le demandeur est…"],
    "Adresse mail de contact": demandeursData["Adresse mail de contact"],
    "Nom du représentant": demandeursData["Nom du représentant"],
    "Prénom du représentant": demandeursData["Prénom du représentant"],
    "Qualité du représentant": demandeursData["Qualité du représentant"],
  };
}

/**
 * Extracts the demandeur information from an import row.
 *
 * - If the demandeur category is "particulier", the type is "une personne physique" and only the email is filled in.
 * - Otherwise, the type is "une personne morale" and we attempt to extract the représentant's last and first name from the "Nom contact – mail" field.
 * - If the last/first name are not found in the field, we attempt to deduce them from the email address.
 */
function generateDemandeursData(
  row: DossierBFCRow,
): Pick<
  DossierDemarcheNumerique88444,
  | "Le demandeur est…"
  | "Nom du représentant"
  | "Prénom du représentant"
  | "Adresse mail de contact"
  | "Qualité du représentant"
> {
  const typeDemandeur =
    row["Catégorie du demandeur"].toLowerCase() === "particulier"
      ? "une personne physique"
      : "une personne morale";

  const nomContactMailValue = row["Nom contact – mail"];

  const mail = extractFirstMail(nomContactMailValue) || "";

  let prenomNom:
    | Partial<{ prénom: string | undefined; nom: string | undefined }>
    | undefined
    | null = extractNom(nomContactMailValue);

  // If no name, we try to retrieve the last and first name from the email
  if (!prenomNom && mail) {
    prenomNom = extractNomFromMail(nomContactMailValue);
  }

  if (typeDemandeur === "une personne morale") {
    return {
      "Le demandeur est…": typeDemandeur,
      "Nom du représentant": prenomNom?.nom ?? "",
      "Prénom du représentant": prenomNom?.prénom ?? "",
      "Adresse mail de contact": mail,
      "Qualité du représentant": row["PETITIONNAIRE"],
    };
  } else {
    return {
      "Le demandeur est…": typeDemandeur,
      "Adresse mail de contact": mail,
      "Nom du représentant": "",
      "Prénom du représentant": "",
      "Qualité du représentant": "",
    };
  }
}

function generateAutorisationEnvironnementaleData(
  row: DossierBFCRow,
): Pick<
  DossierDemarcheNumerique88444,
  | "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?"
  | "À quelle procédure le projet est-il soumis ?"
> {
  const procedure_associee = row["Procédure associée"].toLowerCase();

  if (procedure_associee === "autorisation environnementale") {
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

async function generateLocalisationsData(row: {
  Communes: string | undefined;
  Département: number | string;
}): Promise<
  Partial<
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
    >
> {
  const communesValues = extractCommunes(row["Communes"] ?? "");

  const communesPromises = communesValues.map((com) => getCommuneData(com));
  const departementsPromise = formatDepartementFromValue(row["Département"]);

  const [departementsResult, communesResult] = await Promise.all([
    departementsPromise,
    Promise.all(communesPromises),
  ]);

  const communes = communesResult
    .map((communeResult) => communeResult.data)
    .filter((commune) => commune !== null);

  const foundDepartements = departementsResult.data;

  const departementColumn =
    Array.isArray(foundDepartements) && foundDepartements[0] ? foundDepartements[0] : undefined;

  if (communes.length >= 1) {
    const firstCommuneDepartement = communes[0].departement;

    return {
      "Commune(s) où se situe le projet": communes,
      "Département(s) où se situe le projet": undefined,
      "Le projet se situe au niveau…": "d'une ou plusieurs communes",
      "Dans quel département se localise majoritairement votre projet ?":
        departementColumn ?? firstCommuneDepartement,
    };
  } else {
    const départements = Array.isArray(foundDepartements)
      ? foundDepartements
      : [{ code: "25", nom: "Doubs" }]; // The default value is the département of the DREAL BFC head office
    return {
      "Commune(s) où se situe le projet": undefined,
      "Département(s) où se situe le projet": départements,
      "Le projet se situe au niveau…": "d'un ou plusieurs départements",
      "Dans quel département se localise majoritairement votre projet ?": départements[0],
    };
  }
}

/**
 * This function fills the "prochaine_action_attendue_par" field in the database
 */
function generateProchaineActionAttenduePar(row: DossierBFCRow): string {
  const value = row["Stade de l’avis"].trim();

  if (value === "En attente d’éléments pétitionnaire") {
    return "Pétitionnaire";
  } else if (value === "En attente avis CSRPN/CNPN") {
    return "CNPN/CSRPN";
  } else if (value === "En cours d’examen par DBIO") {
    return "Autre administration";
  } else if (value === "En attente signature") {
    return "Autre administration";
  } else if (value === "Clos") {
    return "Personne";
  }

  // By default, we consider that the next expected action is the instructeur.i.ce's
  return "Instructeur";
}

function createEvenementPhaseDossierData(
  row: DossierBFCRow,
): PartialBy<EvenementPhaseDossierInitializer, "dossier">[] | undefined {
  const today = new Date();

  const evenementPhaseDossierData: PartialBy<EvenementPhaseDossierInitializer, "dossier">[] = [];

  const rowEtapeProjet = row["Etapes du projet"].trim();

  // Add the Accompagnement amont phase event
  if (
    rowEtapeProjet === "Phase amont" ||
    rowEtapeProjet === "Pôle EnR" ||
    rowEtapeProjet === "Contentieux"
  ) {
    evenementPhaseDossierData.push({
      phase: "Accompagnement amont",
      horodatage: isValidDateString(row["Date de sollicitation"].toString())
        ? new Date(row["Date de sollicitation"])
        : today,
    });
  }

  // Add the Instruction phase event
  if (row["DEP"].toLowerCase().trim() === "oui") {
    if (!isValidDateString(row["Date de dépôt DEP"])) {
      console.warn(
        `Date de dépôt DEP invalide : La colonne DEP spécifie "oui" mais la date de Dépôt DEP n'est pas valide. On prend alors la date de sollictation si elle est valide, sinon la date d'aujourd'hui.`,
      );
    }
    evenementPhaseDossierData.push({
      phase: "Instruction",
      horodatage: isValidDateString(row["Date de dépôt DEP"])
        ? new Date(row["Date de dépôt DEP"])
        : isValidDateString(row["Date de sollicitation"].toString())
          ? new Date(row["Date de sollicitation"])
          : today,
    });
  } else if (rowEtapeProjet === "Phase d’instruction") {
    evenementPhaseDossierData.push({
      phase: "Instruction",
      horodatage: isValidDateString(row["Date de dépôt DEP"])
        ? new Date(row["Date de dépôt DEP"])
        : isValidDateString(row["Date de sollicitation"].toString())
          ? addMonths(new Date(row["Date de sollicitation"]), 1)
          : today,
    });
  }

  // Add the Controle phase event
  if (isValidDateString(row["Date AP"])) {
    evenementPhaseDossierData.push({
      phase: "Controle",
      horodatage: new Date(row["Date AP"]),
    });
  } else if (rowEtapeProjet === "Controle") {
    evenementPhaseDossierData.push({
      phase: "Controle",
      horodatage: isValidDateString(row["Date de sollicitation"].toString())
        ? addMonths(new Date(row["Date de sollicitation"]), 3)
        : today,
    });
  }

  if (evenementPhaseDossierData.length >= 1) {
    return evenementPhaseDossierData;
  } else {
    return undefined;
  }
}

function createDecisionAdministrativeData(
  row: DossierBFCRow,
): PartialBy<DecisionAdministrativeInitializer, "dossier">[] | undefined {
  let décision_administrative;

  const rowDerogationAccordee = row["Dérogation accordée"].trim().toLowerCase();

  let date_signature = isValidDateString(row["Date AP"])
    ? new Date(row["Date AP"])
    : addMonths(new Date(row["Date de sollicitation"]), 3);

  if (rowDerogationAccordee === "non") {
    décision_administrative = {
      date_signature,
      type: "Arrêté refus",
    };
  } else if (rowDerogationAccordee === "oui" || rowDerogationAccordee === "autorisé avec dep") {
    décision_administrative = {
      date_signature,
      type: "Arrêté dérogation",
    };
  }

  if (décision_administrative) {
    return [décision_administrative];
  }
}

function createAvisExpertData(
  row: DossierBFCRow,
): PartialBy<AvisExpertInitializer, "dossier">[] | undefined {
  const saisine_csrpn_cnpn = row["Saisine CSRPN/CNPN"];
  const date_saisine_csrpn_cnpn = row["Date saisine CSRPN/CNPN"];
  const avis_csrpn_cnpn = row["Avis CSRPN/CNPN"];
  const date_avis_csrpn_cnpn = row["Date avis CSRPN/CNPN"];

  if (saisine_csrpn_cnpn && saisine_csrpn_cnpn.trim().length >= 1) {
    return [
      {
        expert: saisine_csrpn_cnpn,
        date_saisine: isValidDateString(date_saisine_csrpn_cnpn)
          ? new Date(date_saisine_csrpn_cnpn)
          : undefined,
        avis: avis_csrpn_cnpn && avis_csrpn_cnpn.length >= 1 ? avis_csrpn_cnpn : undefined,
        date_avis: isValidDateString(date_avis_csrpn_cnpn)
          ? new Date(date_avis_csrpn_cnpn)
          : undefined,
      },
    ];
  }
}

/**
 * Extracts the additional data (NE PAS MODIFIER) from an import row.
 */
export function createAdditionalDataFromRow(row: DossierBFCRow): AdditionalDataForDossierCreation {
  const description = row["Description avancement dossier avec dates"]
    ? "Description avancement dossier avec dates : " +
      row["Description avancement dossier avec dates"]
    : "";
  const observations = row["OBSERVATIONS"] ? "Observations : " + row["OBSERVATIONS"] : "";

  const sollicitationOFB =
    row["Sollicitation OFB pour avis"].toLowerCase() === "oui"
      ? "Ce dossier nécessite une sollicitation OFB pour avis."
      : null;
  const commentaire_libre = [description, observations, sollicitationOFB]
    .filter((value) => value?.trim())
    .join("\n");

  if (!isValidDateString(row["Date de sollicitation"].toString())) {
    console.warn("Date de sollicitation invalide.");
  }

  const foundEmail = extractFirstMail(row["POUR\nATTRIBUTION"]);

  const personnes_qui_suivent = foundEmail ? [{ email: foundEmail }] : undefined;

  const evenementPhaseDossierData = createEvenementPhaseDossierData(row);

  const décision_administrative = createDecisionAdministrativeData(row);

  const avis_expert = createAvisExpertData(row);

  return {
    dossier: {
      commentaire_libre: commentaire_libre,
      date_dépôt: isValidDateString(row["Date de sollicitation"].toString())
        ? row["Date de sollicitation"]
        : new Date(),
      historique_identifiant_demande_onagre:
        row["N° de l’avis Onagre ou interne"] &&
        row["N° de l’avis Onagre ou interne"].trim().length >= 1
          ? row["N° de l’avis Onagre ou interne"]
          : undefined,
      prochaine_action_attendue_par: generateProchaineActionAttenduePar(row),
    },
    évènement_phase_dossier: evenementPhaseDossierData,
    avis_expert,
    décision_administrative,
    personnes_qui_suivent,
  };
}
