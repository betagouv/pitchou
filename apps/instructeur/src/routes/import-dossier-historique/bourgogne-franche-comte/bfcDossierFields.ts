import {
  extractFirstMail,
  extractName,
  extractNameFromEmail,
  formatDepartementFromValue,
  extractCommunes,
  getCommuneData,
} from "../importDossierUtils.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type { DossierBFCRow } from "./DossierBFCRow.ts";

const thematiques = new Map<string, DossierDemarcheNumerique88444["Activité principale"]>([
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

export function bfcActivite(
  value: string,
  available: Set<DossierDemarcheNumerique88444["Activité principale"]>,
) {
  if (available.has(value as DossierDemarcheNumerique88444["Activité principale"]))
    return value as DossierDemarcheNumerique88444["Activité principale"];
  const activite = thematiques.get(value);
  if (!activite) console.warn("Thématique BFC non associée à une activité Pitchou", value);
  return activite ?? "Autre";
}

export function bfcDemandeur(row: DossierBFCRow) {
  const type =
    row["Catégorie du demandeur"].toLowerCase() === "particulier"
      ? "une personne physique"
      : "une personne morale";
  const email = extractFirstMail(row["Nom contact – mail"]) || "";
  const name =
    extractName(row["Nom contact – mail"]) ||
    (email ? extractNameFromEmail(row["Nom contact – mail"]) : null);
  return {
    "Le demandeur est…": type,
    "Adresse mail de contact": email,
    "Nom du représentant": type === "une personne morale" ? (name?.lastName ?? "") : "",
    "Prénom du représentant": type === "une personne morale" ? (name?.firstName ?? "") : "",
    "Qualité du représentant": type === "une personne morale" ? row.PETITIONNAIRE : "",
  } as Pick<
    DossierDemarcheNumerique88444,
    | "Le demandeur est…"
    | "Nom du représentant"
    | "Prénom du représentant"
    | "Adresse mail de contact"
    | "Qualité du représentant"
  >;
}

export function bfcAutorisation(row: DossierBFCRow) {
  const oui = row["Procédure associée"].toLowerCase() === "autorisation environnementale";
  return {
    "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?":
      oui ? "Oui" : "Non",
    "À quelle procédure le projet est-il soumis ?": oui
      ? ["Autorisation ICPE", "Autorisation loi sur l'eau"]
      : [],
  } as Pick<
    DossierDemarcheNumerique88444,
    | "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?"
    | "À quelle procédure le projet est-il soumis ?"
  >;
}

export async function bfcLocalisation(row: DossierBFCRow) {
  const [departements, communesResults] = await Promise.all([
    formatDepartementFromValue(row.Département),
    Promise.all(extractCommunes(row.Communes ?? "").map(getCommuneData)),
  ]);
  const communes = communesResults
    .map((result) => result.data)
    .filter((commune) => commune !== null);
  const found = departements.data;
  const column = Array.isArray(found) ? found[0] : undefined;
  if (communes.length)
    return {
      "Commune(s) où se situe le projet": communes,
      "Département(s) où se situe le projet": undefined,
      "Le projet se situe au niveau…": "d'une ou plusieurs communes" as const,
      "Dans quel département se localise majoritairement votre projet ?":
        column ?? communes[0].departement,
    };
  const departments = Array.isArray(found) ? found : [{ code: "25", nom: "Doubs" }];
  return {
    "Commune(s) où se situe le projet": undefined,
    "Département(s) où se situe le projet": departments,
    "Le projet se situe au niveau…": "d'un ou plusieurs départements" as const,
    "Dans quel département se localise majoritairement votre projet ?": departments[0],
  };
}
