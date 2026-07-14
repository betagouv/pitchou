import ky from "ky";
import {
  clefAE,
  schemaToChampLabelToChampId,
} from "@pitchou/common/preremplissageDemarcheNumerique.ts";

import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type { SchemaDemarcheSimplifiee } from "@pitchou/types/demarche-numerique/schema.ts";

const communeChampRepete = `champ_Q2hhbXAtNDA0MTQ0Mw`;
const departementChampRepete = `champ_Q2hhbXAtNDA0MTQ0Nw`;

function creerObjetPreremplissageChamp(
  dossierPartiel: Partial<DossierDemarcheNumerique88444>,
  schema88444: SchemaDemarcheSimplifiee,
): Record<string, string | string[] | any[]> {
  const demarcheDossierLabelToId = schemaToChampLabelToChampId(schema88444);

  const objetPreremplissage: ReturnType<typeof creerObjetPreremplissageChamp> = {};

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
      const valeur: DossierDemarcheNumerique88444[keyof DossierDemarcheNumerique88444] | undefined =
        dossierPartiel[champ];
      if (valeur) {
        // the `champ_` is a convention for the pre-filling of Démarche Numérique
        objetPreremplissage[`champ_${demarcheDossierLabelToId.get(champ)}`] = valeur.toString();
      }
    }
  }

  if (
    Array.isArray(dossierPartiel["À quelle procédure le projet est-il soumis ?"]) &&
    dossierPartiel["À quelle procédure le projet est-il soumis ?"].length >= 1
  ) {
    objetPreremplissage[
      `champ_${demarcheDossierLabelToId.get("À quelle procédure le projet est-il soumis ?")}`
    ] = dossierPartiel["À quelle procédure le projet est-il soumis ?"];
  }

  if (dossierPartiel["Numéro de SIRET"]) {
    objetPreremplissage[`champ_${demarcheDossierLabelToId.get("Numéro de SIRET")}`] =
      dossierPartiel["Numéro de SIRET"];
  }

  if (typeof dossierPartiel[clefAE] === "boolean") {
    objetPreremplissage[`champ_${demarcheDossierLabelToId.get(clefAE)}`] = dossierPartiel[clefAE]
      ? "true"
      : "false";
  }

  if (dossierPartiel["Dans quel département se localise majoritairement votre projet ?"]) {
    objetPreremplissage[
      `champ_${demarcheDossierLabelToId.get("Dans quel département se localise majoritairement votre projet ?")}`
    ] = dossierPartiel["Dans quel département se localise majoritairement votre projet ?"].code;
  }

  // get the départements
  if (
    Array.isArray(dossierPartiel["Département(s) où se situe le projet"]) &&
    dossierPartiel["Département(s) où se situe le projet"].length >= 1
  ) {
    objetPreremplissage[`champ_${demarcheDossierLabelToId.get("Le projet se situe au niveau…")}`] =
      "d'un ou plusieurs départements";

    objetPreremplissage[
      `champ_${demarcheDossierLabelToId.get(`Département(s) où se situe le projet`)}`
    ] = dossierPartiel["Département(s) où se situe le projet"].map(({ code }) => ({
      [departementChampRepete]: code,
    }));
  } else {
    // get the communes
    if (
      Array.isArray(dossierPartiel["Commune(s) où se situe le projet"]) &&
      dossierPartiel["Commune(s) où se situe le projet"].length >= 1
    ) {
      objetPreremplissage[
        `champ_${demarcheDossierLabelToId.get("Le projet se situe au niveau…")}`
      ] = "d'une ou plusieurs communes";

      objetPreremplissage[
        `champ_${demarcheDossierLabelToId.get(`Commune(s) où se situe le projet`)}`
      ] = dossierPartiel["Commune(s) où se situe le projet"]
        .filter((c) => typeof c === "object")
        .map(({ code: codeInsee, codesPostaux: [codePostal] }) => ({
          [communeChampRepete]: [codePostal, codeInsee],
        }));
    }
  }

  return objetPreremplissage;
}

/**
 * Démarche numérique offers 2 methods to create pre-filling links: via GET or POST
 * This function requests a link via POST
 */
export async function demanderLienPreremplissage(
  dossierPartiel: Partial<DossierDemarcheNumerique88444>,
  schema88444: SchemaDemarcheSimplifiee,
): Promise<{ dossier_url: string }> {
  const preRemplissageURL = `https://demarche.numerique.gouv.fr/api/public/v1/demarches/88444/dossiers`;

  return ky
    .post(preRemplissageURL, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Serveur Pitchou - https://github.com/betagouv/pitchou",
      },
      json: creerObjetPreremplissageChamp(dossierPartiel, schema88444),
    })
    .then((resp) => resp.json());
}
