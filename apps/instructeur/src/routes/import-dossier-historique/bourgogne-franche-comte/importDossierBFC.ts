import { addMonths } from "date-fns";
import { isValidDateString } from "@pitchou/common/typeFormat.ts";
import {
  extrairePremierMail,
  extraireNom,
  extraireNomDunMail,
  formaterDepartementDepuisValeur,
  extraireCommunes,
  getCommuneData,
} from "../importDossierUtils.ts";

import type { DonneesSupplementairesPourCreationDossier } from "../importDossierUtils.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type { PartialBy } from "@pitchou/types/tools.d.ts";
import type { EvenementPhaseDossierInitializer as EvenementPhaseDossierInitializer } from "@pitchou/types/database/public/EvenementPhaseDossier.ts";
import type { DecisionAdministrativeInitializer as DecisionAdministrativeInitializer } from "@pitchou/types/database/public/DecisionAdministrative.ts";
import type { AvisExpertInitializer } from "@pitchou/types/database/public/AvisExpert.ts";

export type LigneDossierBFC = {
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

const correspondanceThematiqueVersActivitePrincipale: Map<
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

function convertirThematiqueEnActivitePrincipale(
  thematiqueBFC: string,
  activitesPrincipales88444: Set<DossierDemarcheNumerique88444["Activité principale"]>,
): DossierDemarcheNumerique88444["Activité principale"] {
  // If the thématique is already a pitchou value
  // @ts-ignore
  if (activitesPrincipales88444.has(thematiqueBFC)) {
    // @ts-ignore
    return thematiqueBFC;
  }

  const activite = correspondanceThematiqueVersActivitePrincipale.get(
    thematiqueBFC as ThematiquesOptions,
  );
  if (activite) {
    return activite;
  }

  console.warn("Thématique BFC non associée à une activité Pitchou", thematiqueBFC);

  return "Autre";
}

export function creerNomPourDossier(ligne: LigneDossierBFC): string {
  return "N° Dossier DEROG " + ligne["N° Dossier DEROG"] + " - " + ligne["OBJET"];
}

/**
 * Creates a dossier object from an import row (includes looking up localisation data).
 */
export async function creerDossierDepuisLigne(
  ligne: LigneDossierBFC,
  activitesPrincipales88444: Set<DossierDemarcheNumerique88444["Activité principale"]>,
): Promise<Partial<DossierDemarcheNumerique88444>> {
  const donneesLocalisations = await genererDonneesLocalisations(ligne);
  const donneesDemandeurs = genererDonneesDemandeurs(ligne);
  const donneesAutorisationEnvironnementale = genererDonneesAutorisationEnvironnementale(ligne);

  return {
    "NE PAS MODIFIER - Données techniques associées à votre dossier": JSON.stringify(
      creerDonneesSupplementairesDepuisLigne(ligne),
    ),

    "Nom du projet premettant de l'identifier clairement": creerNomPourDossier(ligne),
    "Dans quel département se localise majoritairement votre projet ?":
      donneesLocalisations["Dans quel département se localise majoritairement votre projet ?"],
    "Avez-vous réalisé un état des lieux écologique complet ?": true, // By default, we answer 'Yes' to this question otherwise the other questions don't show up on DS and the answers are not saved.

    "Commune(s) où se situe le projet": donneesLocalisations["Commune(s) où se situe le projet"],
    "Le projet se situe au niveau…": donneesLocalisations["Le projet se situe au niveau…"],
    "Département(s) où se situe le projet":
      donneesLocalisations["Département(s) où se situe le projet"],
    "Activité principale": convertirThematiqueEnActivitePrincipale(
      ligne["Thématique"],
      activitesPrincipales88444,
    ),
    "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?":
      donneesAutorisationEnvironnementale[
        "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?"
      ],
    "À quelle procédure le projet est-il soumis ?":
      donneesAutorisationEnvironnementale["À quelle procédure le projet est-il soumis ?"],
    "Le demandeur est…": donneesDemandeurs["Le demandeur est…"],
    "Adresse mail de contact": donneesDemandeurs["Adresse mail de contact"],
    "Nom du représentant": donneesDemandeurs["Nom du représentant"],
    "Prénom du représentant": donneesDemandeurs["Prénom du représentant"],
    "Qualité du représentant": donneesDemandeurs["Qualité du représentant"],
  };
}

/**
 * Extracts the demandeur information from an import row.
 *
 * - If the demandeur category is "particulier", the type is "une personne physique" and only the email is filled in.
 * - Otherwise, the type is "une personne morale" and we attempt to extract the représentant's last and first name from the "Nom contact – mail" field.
 * - If the last/first name are not found in the field, we attempt to deduce them from the email address.
 */
function genererDonneesDemandeurs(
  ligne: LigneDossierBFC,
): Pick<
  DossierDemarcheNumerique88444,
  | "Le demandeur est…"
  | "Nom du représentant"
  | "Prénom du représentant"
  | "Adresse mail de contact"
  | "Qualité du représentant"
> {
  const typeDemandeur =
    ligne["Catégorie du demandeur"].toLowerCase() === "particulier"
      ? "une personne physique"
      : "une personne morale";

  const nomContactMailValeur = ligne["Nom contact – mail"];

  const mail = extrairePremierMail(nomContactMailValeur) || "";

  let prenomNom:
    | Partial<{ prénom: string | undefined; nom: string | undefined }>
    | undefined
    | null = extraireNom(nomContactMailValeur);

  // If no name, we try to retrieve the last and first name from the email
  if (!prenomNom && mail) {
    prenomNom = extraireNomDunMail(nomContactMailValeur);
  }

  if (typeDemandeur === "une personne morale") {
    return {
      "Le demandeur est…": typeDemandeur,
      "Nom du représentant": prenomNom?.nom ?? "",
      "Prénom du représentant": prenomNom?.prénom ?? "",
      "Adresse mail de contact": mail,
      "Qualité du représentant": ligne["PETITIONNAIRE"],
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

function genererDonneesAutorisationEnvironnementale(
  ligne: LigneDossierBFC,
): Pick<
  DossierDemarcheNumerique88444,
  | "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?"
  | "À quelle procédure le projet est-il soumis ?"
> {
  const procedure_associee = ligne["Procédure associée"].toLowerCase();

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

async function genererDonneesLocalisations(ligne: {
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
  const valeursCommunes = extraireCommunes(ligne["Communes"] ?? "");

  const communesP = valeursCommunes.map((com) => getCommuneData(com));
  const departementsP = formaterDepartementDepuisValeur(ligne["Département"]);

  const [resultatDepartements, communesResult] = await Promise.all([
    departementsP,
    Promise.all(communesP),
  ]);

  const communes = communesResult
    .map((communeResultat) => communeResultat.data)
    .filter((commune) => commune !== null);

  const departementsTrouves = resultatDepartements.data;

  const departementColonne =
    Array.isArray(departementsTrouves) && departementsTrouves[0]
      ? departementsTrouves[0]
      : undefined;

  if (communes.length >= 1) {
    const departementPremiereCommune = communes[0].departement;

    return {
      "Commune(s) où se situe le projet": communes,
      "Département(s) où se situe le projet": undefined,
      "Le projet se situe au niveau…": "d'une ou plusieurs communes",
      "Dans quel département se localise majoritairement votre projet ?":
        departementColonne ?? departementPremiereCommune,
    };
  } else {
    const départements = Array.isArray(departementsTrouves)
      ? departementsTrouves
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
function genererProchaineActionAttenduePar(ligne: LigneDossierBFC): string {
  const valeur = ligne["Stade de l’avis"].trim();

  if (valeur === "En attente d’éléments pétitionnaire") {
    return "Pétitionnaire";
  } else if (valeur === "En attente avis CSRPN/CNPN") {
    return "CNPN/CSRPN";
  } else if (valeur === "En cours d’examen par DBIO") {
    return "Autre administration";
  } else if (valeur === "En attente signature") {
    return "Autre administration";
  } else if (valeur === "Clos") {
    return "Personne";
  }

  // By default, we consider that the next expected action is the instructeur.i.ce's
  return "Instructeur";
}

function creerDonneesEvenementPhaseDossier(
  ligne: LigneDossierBFC,
): PartialBy<EvenementPhaseDossierInitializer, "dossier">[] | undefined {
  const aujourdhui = new Date();

  const donneesEvenementPhaseDossier: PartialBy<EvenementPhaseDossierInitializer, "dossier">[] = [];

  const ligneEtapeProjet = ligne["Etapes du projet"].trim();

  // Add the Accompagnement amont phase event
  if (
    ligneEtapeProjet === "Phase amont" ||
    ligneEtapeProjet === "Pôle EnR" ||
    ligneEtapeProjet === "Contentieux"
  ) {
    donneesEvenementPhaseDossier.push({
      phase: "Accompagnement amont",
      horodatage: isValidDateString(ligne["Date de sollicitation"].toString())
        ? new Date(ligne["Date de sollicitation"])
        : aujourdhui,
    });
  }

  // Add the Instruction phase event
  if (ligne["DEP"].toLowerCase().trim() === "oui") {
    if (!isValidDateString(ligne["Date de dépôt DEP"])) {
      console.warn(
        `Date de dépôt DEP invalide : La colonne DEP spécifie "oui" mais la date de Dépôt DEP n'est pas valide. On prend alors la date de sollictation si elle est valide, sinon la date d'aujourd'hui.`,
      );
    }
    donneesEvenementPhaseDossier.push({
      phase: "Instruction",
      horodatage: isValidDateString(ligne["Date de dépôt DEP"])
        ? new Date(ligne["Date de dépôt DEP"])
        : isValidDateString(ligne["Date de sollicitation"].toString())
          ? new Date(ligne["Date de sollicitation"])
          : aujourdhui,
    });
  } else if (ligneEtapeProjet === "Phase d’instruction") {
    donneesEvenementPhaseDossier.push({
      phase: "Instruction",
      horodatage: isValidDateString(ligne["Date de dépôt DEP"])
        ? new Date(ligne["Date de dépôt DEP"])
        : isValidDateString(ligne["Date de sollicitation"].toString())
          ? addMonths(new Date(ligne["Date de sollicitation"]), 1)
          : aujourdhui,
    });
  }

  // Add the Controle phase event
  if (isValidDateString(ligne["Date AP"])) {
    donneesEvenementPhaseDossier.push({
      phase: "Controle",
      horodatage: new Date(ligne["Date AP"]),
    });
  } else if (ligneEtapeProjet === "Controle") {
    donneesEvenementPhaseDossier.push({
      phase: "Controle",
      horodatage: isValidDateString(ligne["Date de sollicitation"].toString())
        ? addMonths(new Date(ligne["Date de sollicitation"]), 3)
        : aujourdhui,
    });
  }

  if (donneesEvenementPhaseDossier.length >= 1) {
    return donneesEvenementPhaseDossier;
  } else {
    return undefined;
  }
}

function creerDonneesDecisionAdministrative(
  ligne: LigneDossierBFC,
): PartialBy<DecisionAdministrativeInitializer, "dossier">[] | undefined {
  let décision_administrative;

  const ligneDerogationAccordee = ligne["Dérogation accordée"].trim().toLowerCase();

  let date_signature = isValidDateString(ligne["Date AP"])
    ? new Date(ligne["Date AP"])
    : addMonths(new Date(ligne["Date de sollicitation"]), 3);

  if (ligneDerogationAccordee === "non") {
    décision_administrative = {
      date_signature,
      type: "Arrêté refus",
    };
  } else if (ligneDerogationAccordee === "oui" || ligneDerogationAccordee === "autorisé avec dep") {
    décision_administrative = {
      date_signature,
      type: "Arrêté dérogation",
    };
  }

  if (décision_administrative) {
    return [décision_administrative];
  }
}

function creerDonneesAvisExpert(
  ligne: LigneDossierBFC,
): PartialBy<AvisExpertInitializer, "dossier">[] | undefined {
  const saisine_csrpn_cnpn = ligne["Saisine CSRPN/CNPN"];
  const date_saisine_csrpn_cnpn = ligne["Date saisine CSRPN/CNPN"];
  const avis_csrpn_cnpn = ligne["Avis CSRPN/CNPN"];
  const date_avis_csrpn_cnpn = ligne["Date avis CSRPN/CNPN"];

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
export function creerDonneesSupplementairesDepuisLigne(
  ligne: LigneDossierBFC,
): DonneesSupplementairesPourCreationDossier {
  const description = ligne["Description avancement dossier avec dates"]
    ? "Description avancement dossier avec dates : " +
      ligne["Description avancement dossier avec dates"]
    : "";
  const observations = ligne["OBSERVATIONS"] ? "Observations : " + ligne["OBSERVATIONS"] : "";

  const sollicitationOFB =
    ligne["Sollicitation OFB pour avis"].toLowerCase() === "oui"
      ? "Ce dossier nécessite une sollicitation OFB pour avis."
      : null;
  const commentaire_libre = [description, observations, sollicitationOFB]
    .filter((value) => value?.trim())
    .join("\n");

  if (!isValidDateString(ligne["Date de sollicitation"].toString())) {
    console.warn("Date de sollicitation invalide.");
  }

  const emailTrouve = extrairePremierMail(ligne["POUR\nATTRIBUTION"]);

  const personnes_qui_suivent = emailTrouve ? [{ email: emailTrouve }] : undefined;

  const donneesEvenementPhaseDossier = creerDonneesEvenementPhaseDossier(ligne);

  const décision_administrative = creerDonneesDecisionAdministrative(ligne);

  const avis_expert = creerDonneesAvisExpert(ligne);

  return {
    dossier: {
      commentaire_libre: commentaire_libre,
      date_dépôt: isValidDateString(ligne["Date de sollicitation"].toString())
        ? ligne["Date de sollicitation"]
        : new Date(),
      historique_identifiant_demande_onagre:
        ligne["N° de l’avis Onagre ou interne"] &&
        ligne["N° de l’avis Onagre ou interne"].trim().length >= 1
          ? ligne["N° de l’avis Onagre ou interne"]
          : undefined,
      prochaine_action_attendue_par: genererProchaineActionAttenduePar(ligne),
    },
    évènement_phase_dossier: donneesEvenementPhaseDossier,
    avis_expert,
    décision_administrative,
    personnes_qui_suivent,
  };
}
