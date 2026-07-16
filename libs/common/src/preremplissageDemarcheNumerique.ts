/*
    In this file, we focus specifically on the démarche 88444

    https://demarche.numerique.gouv.fr/admin/procedures/88444
    https://demarche.numerique.gouv.fr/commencer/derogation-especes-protegees
    https://demarche.numerique.gouv.fr/preremplir/derogation-especes-protegees

*/

// Created from the schema https://demarche.numerique.gouv.fr/preremplir/derogation-especes-protegees/schema
// which was copied here: data/schema-DS-88444.json (and should be kept up to date)
/* 

await fetch('https://demarche.numerique.gouv.fr/preremplir/derogation-especes-protegees/schema')
    .then(r => r.json())
    .then(schema => schema.revision.champDescriptors
        .filter(c => c.__typename !== 'HeaderSectionChampDescriptor')
        .map(({id, label}) => [label, id])
    ) 

*/

import type { GeoAPICommune, GeoAPIDepartement } from "@pitchou/types/GeoAPI.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type { SchemaDemarcheSimplifiee } from "@pitchou/types/demarche-numerique/schema.ts";

export const keyAE: keyof DossierDemarcheNumerique88444 =
  "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?";

export function schemaToChampLabelToChampId(
  schema: SchemaDemarcheSimplifiee,
): Map<keyof DossierDemarcheNumerique88444, string> {
  //@ts-expect-error the schema labels are the keys of DossierDemarcheNumerique88444 and TS cannot understand this
  return new Map(
    schema.revision.champDescriptors
      .filter((c) => c.__typename !== "HeaderSectionChampDescriptor")
      .map(({ id, label }) => [label, id]),
  );
}

/**
 * Buggy, but we don't yet know why
 * Probably a bug on the Démarche Numérique side
 * https://mattermost.incubateur.net/betagouv/pl/tipfbemo1tfymr6qoguggag4gc
 */
function makeCommuneParam(
  { code: codeInsee, codesPostaux: [codePostal] }: GeoAPICommune,
  demarcheDossierLabelToId: Map<keyof DossierDemarcheNumerique88444, string>,
) {
  const communeChamp = `champ_${demarcheDossierLabelToId.get("Commune(s) où se situe le projet")}`;
  // See https://demarche.numerique.gouv.fr/preremplir/derogation-especes-protegees
  const communeChampRepeated = `champ_Q2hhbXAtNDA0MTQ0Mw`;
  const champCommuneRepeatedURLParamKey = `${encodeURIComponent(communeChamp)}[][${communeChampRepeated}]`;

  return `${champCommuneRepeatedURLParamKey}=${encodeURIComponent(`["${codePostal}","${codeInsee}"]`)}`;
}

/**
 * champ_Q2hhbXAtNDA0MTQ0NQ[][champ_Q2hhbXAtNDA0MTQ0Nw]=56&champ_Q2hhbXAtNDA0MTQ0NQ[][champ_Q2hhbXAtNDA0MTQ0Nw]=56
 */
function makeDepartementParam(
  { code }: GeoAPIDepartement,
  demarcheDossierLabelToId: Map<keyof DossierDemarcheNumerique88444, string>,
) {
  const departementChamp = `champ_${demarcheDossierLabelToId.get("Département(s) où se situe le projet")}`;
  // See https://demarche.numerique.gouv.fr/preremplir/derogation-especes-protegees
  const departementChampRepeated = `champ_Q2hhbXAtNDA0MTQ0Nw`;

  return `${encodeURIComponent(departementChamp)}[][${departementChampRepeated}]=${code}`;
}

const basePrefilling = `https://demarche.numerique.gouv.fr/commencer/derogation-especes-protegees?`;

/**
 * Démarche Numérique offers 2 methods to create pre-fill links: via GET or POST
 * This function creates a GET link
 */
export function createGETPrefillingLinkDemarche(
  partialDossier: Partial<DossierDemarcheNumerique88444>,
  schema88444: SchemaDemarcheSimplifiee,
): string {
  const demarcheDossierLabelToId = schemaToChampLabelToChampId(schema88444);

  const prefillingObject: Record<string, string> = {};

  for (const champ of demarcheDossierLabelToId.keys()) {
    if (
      ![
        "Commune(s) où se situe le projet",
        "Département(s) où se situe le projet",
        "Région(s) où se situe le projet",
      ].includes(champ)
    ) {
      const value: DossierDemarcheNumerique88444[keyof DossierDemarcheNumerique88444] | undefined =
        partialDossier[champ];
      if (value !== undefined && value !== null && value !== "") {
        // the `champ_` is a convention for Démarche Numérique pre-fill
        prefillingObject[`champ_${demarcheDossierLabelToId.get(champ)}`] = value.toString();
      }
    }
  }

  if (partialDossier["Numéro de SIRET"]) {
    prefillingObject[`champ_${demarcheDossierLabelToId.get("Numéro de SIRET")}`] =
      partialDossier["Numéro de SIRET"];
  }

  if (typeof partialDossier[keyAE] === "boolean") {
    prefillingObject[`champ_${demarcheDossierLabelToId.get(keyAE)}`] = partialDossier[keyAE]
      ? "true"
      : "false";
  }

  if (partialDossier["Dans quel département se localise majoritairement votre projet ?"]) {
    prefillingObject[
      `champ_${demarcheDossierLabelToId.get("Dans quel département se localise majoritairement votre projet ?")}`
    ] = partialDossier["Dans quel département se localise majoritairement votre projet ?"].code;
  }

  let departementsURLParam = "";
  let communesURLParam = "";

  // retrieve the départements
  if (
    Array.isArray(partialDossier["Département(s) où se situe le projet"]) &&
    partialDossier["Département(s) où se situe le projet"].length >= 1
  ) {
    prefillingObject[`champ_${demarcheDossierLabelToId.get("Le projet se situe au niveau…")}`] =
      "d'un ou plusieurs départements";
    // An array of dictionaries with the possible values for each field of the repetition.
    // champ_Q2hhbXAtNDA0MTQ0Nw: A département number

    departementsURLParam = partialDossier["Département(s) où se situe le projet"]
      .filter((commune) => Object(commune) === commune)
      .map((d) => makeDepartementParam(d, demarcheDossierLabelToId))
      .join("&");
  } else {
    // retrieve the communes
    if (
      Array.isArray(partialDossier["Commune(s) où se situe le projet"]) &&
      partialDossier["Commune(s) où se situe le projet"].length >= 1
    ) {
      // An array of dictionaries with the possible values for each field of the repetition.
      // champ_Q2hhbXAtNDA0MTQ0Mw: An array containing the postal code and the INSEE code of the commune

      prefillingObject[
        `champ_${demarcheDossierLabelToId.get("Le projet se situe au niveau…")}`
      ] = "d'une ou plusieurs communes";

      communesURLParam = partialDossier["Commune(s) où se situe le projet"]
        .filter((commune) => Object(commune) === commune)
        //@ts-expect-error TS doesn't understand that we kept only the objects after the filter
        .map((c) => makeCommuneParam(c, demarcheDossierLabelToId))
        .join("&");
    }
  }

  return (
    basePrefilling +
    new URLSearchParams(prefillingObject).toString() +
    (communesURLParam ? "&" + communesURLParam : "") +
    (departementsURLParam ? "&" + departementsURLParam : "")
  );
}
