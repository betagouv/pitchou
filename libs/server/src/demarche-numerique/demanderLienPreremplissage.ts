import ky from "ky";
import {
  clefAE,
  schemaToChampLabelToChampId,
} from "@pitchou/common/preremplissageDemarcheNumerique.ts";

import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type { SchemaDemarcheSimplifiee } from "@pitchou/types/demarche-numerique/schema.ts";

const communeChampRepete = `champ_Q2hhbXAtNDA0MTQ0Mw`;
const departementChampRepete = `champ_Q2hhbXAtNDA0MTQ0Nw`;

function createChampPrefillingObject(
  partialDossier: Partial<DossierDemarcheNumerique88444>,
  schema88444: SchemaDemarcheSimplifiee,
): Record<string, string | string[] | any[]> {
  const demarcheDossierLabelToId = schemaToChampLabelToChampId(schema88444);

  const prefillingObject: ReturnType<typeof createChampPrefillingObject> = {};

  for (const champ of demarcheDossierLabelToId.keys()) {
    if (
      ![
        "Commune(s) où se situe le projet",
        "Département(s) où se situe le projet",
        "Région(s) où se situe le projet",
        "À quelle procédure le projet est-il soumis ?",
        // @ts-ignore
      ].includes(champ)
    ) {
      // @ts-ignore
      const value: DossierDemarcheNumerique88444[keyof DossierDemarcheNumerique88444] | undefined =
        partialDossier[champ];
      if (value) {
        // the `champ_` is a convention for the pre-filling of Démarche Numérique
        prefillingObject[`champ_${demarcheDossierLabelToId.get(champ)}`] = value.toString();
      }
    }
  }

  if (
    Array.isArray(partialDossier["À quelle procédure le projet est-il soumis ?"]) &&
    partialDossier["À quelle procédure le projet est-il soumis ?"].length >= 1
  ) {
    prefillingObject[
      `champ_${demarcheDossierLabelToId.get("À quelle procédure le projet est-il soumis ?")}`
    ] = partialDossier["À quelle procédure le projet est-il soumis ?"];
  }

  if (partialDossier["Numéro de SIRET"]) {
    prefillingObject[`champ_${demarcheDossierLabelToId.get("Numéro de SIRET")}`] =
      partialDossier["Numéro de SIRET"];
  }

  if (typeof partialDossier[clefAE] === "boolean") {
    prefillingObject[`champ_${demarcheDossierLabelToId.get(clefAE)}`] = partialDossier[clefAE]
      ? "true"
      : "false";
  }

  if (partialDossier["Dans quel département se localise majoritairement votre projet ?"]) {
    prefillingObject[
      `champ_${demarcheDossierLabelToId.get("Dans quel département se localise majoritairement votre projet ?")}`
    ] = partialDossier["Dans quel département se localise majoritairement votre projet ?"].code;
  }

  // get the départements
  if (
    Array.isArray(partialDossier["Département(s) où se situe le projet"]) &&
    partialDossier["Département(s) où se situe le projet"].length >= 1
  ) {
    prefillingObject[`champ_${demarcheDossierLabelToId.get("Le projet se situe au niveau…")}`] =
      "d'un ou plusieurs départements";

    prefillingObject[
      `champ_${demarcheDossierLabelToId.get(`Département(s) où se situe le projet`)}`
    ] = partialDossier["Département(s) où se situe le projet"].map(({ code }) => ({
      [departementChampRepete]: code,
    }));
  } else {
    // get the communes
    if (
      Array.isArray(partialDossier["Commune(s) où se situe le projet"]) &&
      partialDossier["Commune(s) où se situe le projet"].length >= 1
    ) {
      prefillingObject[
        `champ_${demarcheDossierLabelToId.get("Le projet se situe au niveau…")}`
      ] = "d'une ou plusieurs communes";

      prefillingObject[
        `champ_${demarcheDossierLabelToId.get(`Commune(s) où se situe le projet`)}`
      ] = partialDossier["Commune(s) où se situe le projet"]
        .filter((c) => typeof c === "object")
        .map(({ code: codeInsee, codesPostaux: [codePostal] }) => ({
          [communeChampRepete]: [codePostal, codeInsee],
        }));
    }
  }

  return prefillingObject;
}

/**
 * Démarche numérique offers 2 methods to create pre-filling links: via GET or POST
 * This function requests a link via POST
 */
export async function requestPrefillingLink(
  partialDossier: Partial<DossierDemarcheNumerique88444>,
  schema88444: SchemaDemarcheSimplifiee,
): Promise<{ dossier_url: string }> {
  const prefillingURL = `https://demarche.numerique.gouv.fr/api/public/v1/demarches/88444/dossiers`;

  return ky
    .post(prefillingURL, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Serveur Pitchou - https://github.com/betagouv/pitchou",
      },
      json: createChampPrefillingObject(partialDossier, schema88444),
    })
    .then((resp) => resp.json());
}
