import { json, text } from "d3-fetch";

import type { StringValues } from "@pitchou/types/tools.d.ts";
import type {
  IdentiteInstructeurPitchou,
  PitchouInstructeurCapabilities,
} from "@pitchou/types/capabilities.ts";
import type { default as Dossier } from "@pitchou/types/database/public/Dossier.ts";
import type { default as Message } from "@pitchou/types/database/public/Message.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import { createDossierFollowerCapabilities } from "./dossierFollowerCapabilities.ts";
import { formatDossierFull } from "./createCapObjectFromURLs/formatDossierFull.ts";
import {
  wrapDeleteById,
  wrapGETUrl,
  wrapPOSTMultipart,
  wrapPOSTUrl,
  wrapTextPOST,
} from "./createCapObjectFromURLs/capUrlWrappers.ts";

const commonHeaders = {
  Accept: "application/json",
};

const commonRequestInit = { headers: commonHeaders };

const dossierIdURLParam = ":dossierId";
const decisionAdministrativeIdURLParam = ":decisionAdministrativeId";
const prescriptionIdURLParam = ":prescriptionId";
const controleIdURLParam = ":controleId";
const avisExpertIdURLParam = ":avisExpertId";

/**
 * Builds a DELETE-by-id wrapper. The cap URL must contain `placeholder` (e.g.
 * `:decisionAdministrativeId`); it is replaced with the actual id at call time.
 */
function wrapModifierDossier(
  url: string | undefined,
): ((dossierId: Dossier["id"], body: any) => Promise<any>) | undefined {
  if (!url) return undefined;

  if (!url.includes(dossierIdURLParam)) {
    throw new Error(`La capability modifierDossier ne contient pas '${dossierIdURLParam}'`);
  }

  function modifierDossier(dossierId: Dossier["id"], args: any) {
    console.log("modifierDossier cap", args);

    return json(
      // @ts-ignore
      url.replace(dossierIdURLParam, dossierId),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      },
    );
  }

  return modifierDossier;
}

function wrapListerMessages(
  url: string | undefined,
): ((dossierId: Dossier["id"]) => Promise<Message[]>) | undefined {
  if (!url) return undefined;

  if (!url.includes(dossierIdURLParam)) {
    throw new Error(`La capability listerMessages ne contient pas '${dossierIdURLParam}'`);
  }

  return function listerMessages(dossierId: Dossier["id"]): Promise<Message[]> {
    // @ts-ignore
    return json(url.replace(dossierIdURLParam, dossierId), commonRequestInit);
  };
}

function wrapGetDossierFull(
  url: string | undefined,
): ((dossierId: Dossier["id"]) => Promise<DossierFull>) | undefined {
  if (!url) return undefined;

  if (!url.includes(dossierIdURLParam)) {
    throw new Error(`La capability listerMessages ne contient pas '${dossierIdURLParam}'`);
  }

  /**
   * Fetches the dossier data and formats it.
   */
  return async function getDossierFull(dossierId: Dossier["id"]): Promise<DossierFull> {
    const ret: DossierFull | undefined = await json(
      // @ts-ignore
      url.replace(dossierIdURLParam, dossierId),
      commonRequestInit,
    );

    if (!ret) {
      throw new TypeError(`Aucun dossier trouvé avec id '${dossierId}'`);
    }

    return formatDossierFull(ret);
  };
}

function wrapUpdateFollowRelation(
  url: string | undefined,
): PitchouInstructeurCapabilities["updateFollowRelation"] | undefined {
  if (!url) return undefined;

  return function updateFollowRelation(direction, personneEmail, dossierId) {
    return text(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        direction,
        personneEmail,
        dossierId,
      }),
    }).then(() => undefined);
  };
}

export default function (
  capURLs: StringValues<PitchouInstructeurCapabilities> & {
    identité: IdentiteInstructeurPitchou;
  },
): Partial<PitchouInstructeurCapabilities> & { identité: IdentiteInstructeurPitchou } {
  return {
    listerDossiers: wrapGETUrl(capURLs.listerDossiers),
    recupérerDossierComplet: wrapGetDossierFull(capURLs.recupérerDossierComplet),
    listFollowRelations: wrapGETUrl(capURLs.listFollowRelations),
    updateFollowRelation: wrapUpdateFollowRelation(capURLs.updateFollowRelation),
    ...createDossierFollowerCapabilities(capURLs),
    listerEvenementsPhaseDossier: wrapGETUrl(capURLs.listerEvenementsPhaseDossier),
    listerMessages: wrapListerMessages(capURLs.listerMessages),
    modifierDossier: wrapModifierDossier(capURLs.modifierDossier),
    remplirAnnotations: wrapPOSTUrl(capURLs.remplirAnnotations),
    modifierDecisionAdministrativeDansDossier: wrapTextPOST(
      capURLs.modifierDecisionAdministrativeDansDossier,
    ),
    deleteDecisionAdministrative: wrapDeleteById(
      capURLs.deleteDecisionAdministrative,
      decisionAdministrativeIdURLParam,
    ),
    addOrUpdatePrescription: wrapPOSTUrl(capURLs.addOrUpdatePrescription),
    addPrescriptionsAndControles: wrapPOSTUrl(capURLs.addPrescriptionsAndControles),
    deletePrescription: wrapDeleteById(capURLs.deletePrescription, prescriptionIdURLParam),
    addOrUpdateControle: wrapPOSTUrl(capURLs.addOrUpdateControle),
    deleteControle: wrapDeleteById(capURLs.deleteControle, controleIdURLParam),
    addOrUpdateAvisExpert: wrapPOSTMultipart(capURLs.addOrUpdateAvisExpert),
    addOtherAttachment: wrapPOSTMultipart(capURLs.addOtherAttachment),
    deleteAvisExpert: wrapDeleteById(capURLs.deleteAvisExpert, avisExpertIdURLParam),
    // keepalive lets the request survive the page being closed, since search events
    // are flushed when the page becomes hidden (see aarri.ts)
    creerEvenementMetrique: wrapPOSTUrl(capURLs.creerEvenementMetrique, { keepalive: true }),
    listRecentSearches: wrapGETUrl(capURLs.listRecentSearches),
    identité: capURLs.identité,
    listerNotifications: wrapGETUrl(capURLs.listerNotifications),
    updateNotificationForDossier: wrapPOSTUrl(capURLs.updateNotificationForDossier),
  };
}
