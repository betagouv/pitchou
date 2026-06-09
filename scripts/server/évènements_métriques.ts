import { phases, prochaineActionAttenduePar } from "../commun/phases.ts";

import type { ÉvènementMétrique, ÉvènementRechercheDossiersDétails } from "../types/évènement.d.ts";

function estDétailsDossier(détails: any): détails is { dossierId: number } {
  if (Object(détails) === détails) {
    return Number.isInteger(détails.dossierId);
  } else {
    return false;
  }
}

function estRechercheDossierDétails(détails: any): détails is ÉvènementRechercheDossiersDétails {
  if (Object(détails) !== détails) {
    return false;
  }

  if (typeof détails.nombreRésultats !== "number") {
    return false;
  }

  if (!détails.filtres) {
    return false;
  }

  const filtres = détails.filtres;

  if (filtres.suiviPar) {
    const suiviPar = filtres.suiviPar;
    const estSuiviPar =
      typeof suiviPar.nombreSéléctionnées === "number" &&
      typeof suiviPar.nombreTotal === "number" &&
      typeof suiviPar.inclusSoiMême === "boolean";

    if (!estSuiviPar) {
      return false;
    }
  }

  if (filtres.sansInstructeurice !== undefined && typeof filtres.sansInstructeurice !== "boolean") {
    return false;
  }

  if (filtres.texte !== undefined && typeof filtres.texte !== "string") {
    return false;
  }

  if (filtres.activitésPrincipales && Array.isArray(filtres.activitésPrincipales)) {
    const estActivitésPrincipales = filtres.activitésPrincipales.every(
      (activité: any) => typeof activité === "string",
    );

    if (!estActivitésPrincipales) {
      return false;
    }
  }

  if (filtres.phases && Array.isArray(filtres.phases)) {
    const estPhases = filtres.phases.every((peutÊtrePhase: any) => {
      return phases.has(peutÊtrePhase);
    });
    if (!estPhases) {
      return false;
    }
  }

  if (filtres.prochaineActionAttenduePar && Array.isArray(filtres.prochaineActionAttenduePar)) {
    const estProchaineActionAttenduePar = filtres.prochaineActionAttenduePar.every(
      (peutProchaineActionPar: any) => {
        return (
          peutProchaineActionPar === "(vide)" ||
          prochaineActionAttenduePar.has(peutProchaineActionPar)
        );
      },
    );
    if (!estProchaineActionAttenduePar) {
      return false;
    }
  }

  return true;
}

export function évènementMétriqueGuard(évènement: any): évènement is ÉvènementMétrique {
  if (!évènement.type) {
    return false;
  }

  const type: ÉvènementMétrique["type"] = évènement.type;

  switch (type) {
    case "seConnecter":
      return !("détails" in évènement);
    case "suivreUnDossier":
      return estDétailsDossier(évènement.détails);
    case "rechercherDesDossiers":
      return estRechercheDossierDétails(évènement.détails);
    case "modifierCommentaireInstruction":
      return !("détails" in évènement);
    case "afficherLesDossiersSuivis":
      return !("détails" in évènement);
    case "consulterUnDossier":
      return estDétailsDossier(évènement.détails);
    case "téléchargerListeÉspècesImpactées":
      return estDétailsDossier(évènement.détails);
    case "changerPhase": {
      return !("details" in évènement);
    }
    case "changerProchaineActionAttendueDe": {
      return !("details" in évènement);
    }
    case "ajouterDécisionAdministrative":
    case "modifierDécisionAdministrative":
    case "supprimerDécisionAdministrative": {
      return !("details" in évènement);
    }
    case "ajouterPrescription":
    case "modifierPrescription":
    case "supprimerPrescription": {
      return !("details" in évènement);
    }
    case "ajouterContrôle":
    case "modifierContrôle":
    case "supprimerContrôle": {
      return !("details" in évènement);
    }
    case "ajouterAvisExpert": {
      return !("details" in évènement);
    }
    case "modifierAvisExpert": {
      return !("details" in évènement);
    }
    case "supprimerAvisExpert": {
      return !("details" in évènement);
    }
    case "générerUnDocument": {
      return !("details" in évènement);
    }
    case "retourÀLaConformité": {
      return typeof évènement.détails.prescription === "string";
    }
    default: {
      // Pour que TypeScript détecte si on a oublié un 'case'
      const neverType: never = type;

      // faire semblant d'utiliser pour pour satisfaire TypeScript
      void neverType;

      console.error(`le type d'événement '${type}' est inconnu`);
      return false;
    }
  }
}
