import { json, text } from "d3-fetch";

import type { StringValues } from "@pitchou/types/tools.d.ts";
import type {
  IdentiteInstructeurPitchou,
  PitchouInstructeurCapabilities,
} from "@pitchou/types/capabilities.ts";
import type { default as Dossier } from "@pitchou/types/database/public/Dossier.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import { createDossierFollowerCapabilities } from "./dossierFollowerCapabilities.ts";
import { createDossierPartageCapabilities } from "./dossierPartageCapabilities.ts";
import { createDossierCommentaireCapabilities } from "./dossierCommentaireCapabilities.ts";
import { formatDossierFull } from "./createCapObjectFromURLs/formatDossierFull.ts";
import {
  RequestError,
  wrapDeleteById,
  wrapGETUrl,
  wrapPOSTMultipart,
  wrapPOSTUrl,
  wrapTextPOST,
} from "./createCapObjectFromURLs/requestWrappers.ts";

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

function wrapGetDossierFull(
  url: string | undefined,
): ((dossierId: Dossier["id"]) => Promise<DossierFull>) | undefined {
  if (!url) return undefined;

  if (!url.includes(dossierIdURLParam)) {
    throw new Error(`La capability recupérerDossierComplet ne contient pas '${dossierIdURLParam}'`);
  }

  /**
   * Fetches the dossier data and formats it.
   */
  return async function getDossierFull(
    dossierId: Dossier["id"],
    readOnly = false,
  ): Promise<DossierFull> {
    const dossierURL = new URL(
      url.replace(dossierIdURLParam, String(dossierId)),
      globalThis.location.href,
    );
    // Asking for the read-only projection is the client's half of the contract:
    // the server is the one that decides what it contains.
    if (readOnly) dossierURL.searchParams.set("lecture", "1");

    const ret: DossierFull | undefined = await json(dossierURL.toString(), commonRequestInit);

    if (!ret) {
      throw new TypeError(`Aucun dossier trouvé avec id '${dossierId}'`);
    }

    return formatDossierFull(ret);
  };
}

function wrapEnvoyerEmailCnpn(
  url: string | undefined,
): PitchouInstructeurCapabilities["envoyerEmailCnpn"] | undefined {
  if (!url) return undefined;
  if (!url.includes(dossierIdURLParam)) {
    throw new Error(`La capability envoyerEmailCnpn ne contient pas '${dossierIdURLParam}'`);
  }

  return async (dossierId, email) => {
    const response = await fetch(url.replace(dossierIdURLParam, String(dossierId)), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(email),
    });
    const body = (await response.json().catch(() => undefined)) as
      | Awaited<ReturnType<PitchouInstructeurCapabilities["envoyerEmailCnpn"]>>
      | { message?: unknown }
      | undefined;
    if (!response.ok) {
      const message =
        body && "message" in body && typeof body.message === "string"
          ? body.message
          : `L'envoi a échoué (${response.status}).`;
      throw new RequestError(response.status, message);
    }
    if (!body || "message" in body) {
      throw new Error("Le serveur n'a pas renvoyé l'évènement d'envoi.");
    }
    return body as Awaited<ReturnType<PitchouInstructeurCapabilities["envoyerEmailCnpn"]>>;
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
    ...createDossierPartageCapabilities(capURLs),
    ...createDossierCommentaireCapabilities(capURLs),
    listerEvenementsPhaseDossier: wrapGETUrl(capURLs.listerEvenementsPhaseDossier),
    modifierDossier: wrapModifierDossier(capURLs.modifierDossier),
    envoyerEmailCnpn: wrapEnvoyerEmailCnpn(capURLs.envoyerEmailCnpn),
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
