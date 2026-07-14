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

export const clefAE: keyof DossierDemarcheNumerique88444 =
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
  const communeChampRepete = `champ_Q2hhbXAtNDA0MTQ0Mw`;
  const champCommuneRepeteURLParamKey = `${encodeURIComponent(communeChamp)}[][${communeChampRepete}]`;

  return `${champCommuneRepeteURLParamKey}=${encodeURIComponent(`["${codePostal}","${codeInsee}"]`)}`;
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
  const departementChampRepete = `champ_Q2hhbXAtNDA0MTQ0Nw`;

  return `${encodeURIComponent(departementChamp)}[][${departementChampRepete}]=${code}`;
}

const basePreremplissage = `https://demarche.numerique.gouv.fr/commencer/derogation-especes-protegees?`;

/**
 * Démarche Numérique offers 2 methods to create pre-fill links: via GET or POST
 * This function creates a GET link
 */
export function creerLienGETPreremplissageDemarche(
  dossierPartiel: Partial<DossierDemarcheNumerique88444>,
  schema88444: SchemaDemarcheSimplifiee,
): string {
  const demarcheDossierLabelToId = schemaToChampLabelToChampId(schema88444);

  const objetPreremplissage: Record<string, string> = {};

  for (const champ of demarcheDossierLabelToId.keys()) {
    if (
      ![
        "Commune(s) où se situe le projet",
        "Département(s) où se situe le projet",
        "Région(s) où se situe le projet",
      ].includes(champ)
    ) {
      const valeur: DossierDemarcheNumerique88444[keyof DossierDemarcheNumerique88444] | undefined =
        dossierPartiel[champ];
      if (valeur !== undefined && valeur !== null && valeur !== "") {
        // the `champ_` is a convention for Démarche Numérique pre-fill
        objetPreremplissage[`champ_${demarcheDossierLabelToId.get(champ)}`] = valeur.toString();
      }
    }
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

  let departementsURLParam = "";
  let communesURLParam = "";

  // retrieve the départements
  if (
    Array.isArray(dossierPartiel["Département(s) où se situe le projet"]) &&
    dossierPartiel["Département(s) où se situe le projet"].length >= 1
  ) {
    objetPreremplissage[`champ_${demarcheDossierLabelToId.get("Le projet se situe au niveau…")}`] =
      "d'un ou plusieurs départements";
    // An array of dictionaries with the possible values for each field of the repetition.
    // champ_Q2hhbXAtNDA0MTQ0Nw: A département number

    departementsURLParam = dossierPartiel["Département(s) où se situe le projet"]
      .filter((commune) => Object(commune) === commune)
      .map((d) => makeDepartementParam(d, demarcheDossierLabelToId))
      .join("&");
  } else {
    // retrieve the communes
    if (
      Array.isArray(dossierPartiel["Commune(s) où se situe le projet"]) &&
      dossierPartiel["Commune(s) où se situe le projet"].length >= 1
    ) {
      // An array of dictionaries with the possible values for each field of the repetition.
      // champ_Q2hhbXAtNDA0MTQ0Mw: An array containing the postal code and the INSEE code of the commune

      objetPreremplissage[
        `champ_${demarcheDossierLabelToId.get("Le projet se situe au niveau…")}`
      ] = "d'une ou plusieurs communes";

      communesURLParam = dossierPartiel["Commune(s) où se situe le projet"]
        .filter((commune) => Object(commune) === commune)
        //@ts-expect-error TS doesn't understand that we kept only the objects after the filter
        .map((c) => makeCommuneParam(c, demarcheDossierLabelToId))
        .join("&");
    }
  }

  //console.log('objetPréremplissage', objetPréremplissage, dossierPartiel)

  return (
    basePreremplissage +
    new URLSearchParams(objetPreremplissage).toString() +
    (communesURLParam ? "&" + communesURLParam : "") +
    (departementsURLParam ? "&" + departementsURLParam : "")
  );
}
