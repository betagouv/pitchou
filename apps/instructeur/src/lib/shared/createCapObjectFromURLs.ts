import { json, text } from "d3-fetch";

import type { StringValues } from "@pitchou/types/tools.d.ts";
import type {
  IdentiteInstructeurPitchou,
  PitchouInstructeurCapabilities,
} from "@pitchou/types/capabilities.ts";
import type { default as Dossier } from "@pitchou/types/database/public/Dossier.ts";
import type { default as Message } from "@pitchou/types/database/public/Message.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

const commonHeaders = {
  Accept: "application/json",
};

const commonRequestInit = { headers: commonHeaders };

function wrapGETUrl(url: string | undefined): (() => Promise<any>) | undefined {
  if (!url) return undefined;

  return () => json(url, commonRequestInit);
}

function wrapPOSTUrl(
  url: string | undefined,
  extraInit: RequestInit = {},
): ((body: any) => Promise<any>) | undefined {
  if (!url) return undefined;

  return (args: any) =>
    json(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
      ...extraInit,
    });
}

const dossierIdURLParam = ":dossierId";
const decisionAdministrativeIdURLParam = ":decisionAdministrativeId";
const prescriptionIdURLParam = ":prescriptionId";
const controleIdURLParam = ":controleId";
const avisExpertIdURLParam = ":avisExpertId";

/**
 * Builds a DELETE-by-id wrapper. The cap URL must contain `placeholder` (e.g.
 * `:decisionAdministrativeId`); it is replaced with the actual id at call time.
 */
function wrapDeleteById(
  url: string | undefined,
  placeholder: string,
): ((id: any) => Promise<unknown>) | undefined {
  if (!url) return undefined;

  if (!url.includes(placeholder)) {
    throw new Error(`Cap URL ${url} ne contient pas le placeholder ${placeholder}`);
  }

  return (id) =>
    text(url.replace(placeholder, encodeURIComponent(String(id))), { method: "DELETE" });
}

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

    // Date formatting
    if (ret.date_début_intervention) {
      ret.date_début_intervention = new Date(ret.date_début_intervention);
    }
    if (ret.date_fin_intervention) {
      ret.date_fin_intervention = new Date(ret.date_fin_intervention);
    }
    if (ret.date_dépôt) {
      ret.date_dépôt = new Date(ret.date_dépôt);
    }

    // The espèces impactées file is served on demand via espècesImpactées.url
    if (ret.espècesImpactées) {
      Object.freeze(ret.espècesImpactées);
    }
    if (ret.évènementsPhase) {
      Object.freeze(ret.évènementsPhase);
    }

    // the dates fetched from the JSON are strings
    // here, we convert them back into Dates
    if (ret.décisionsAdministratives) {
      ret.décisionsAdministratives = ret.décisionsAdministratives.map((decisionAdministrative) => {
        if (decisionAdministrative.date_signature) {
          decisionAdministrative.date_signature = new Date(decisionAdministrative.date_signature);
        }
        if (decisionAdministrative.date_fin_obligations) {
          decisionAdministrative.date_fin_obligations = new Date(
            decisionAdministrative.date_fin_obligations,
          );
        }

        if (Array.isArray(decisionAdministrative.prescriptions)) {
          for (const p of decisionAdministrative.prescriptions) {
            if (p.date_échéance) p.date_échéance = new Date(p.date_échéance);

            if (Array.isArray(p.contrôles)) {
              for (const contrôle of p.contrôles) {
                if (contrôle.date_contrôle) {
                  contrôle.date_contrôle = new Date(contrôle.date_contrôle);
                }
                if (contrôle.date_action_suite_contrôle) {
                  contrôle.date_action_suite_contrôle = new Date(
                    contrôle.date_action_suite_contrôle,
                  );
                }
                if (contrôle.date_prochaine_échéance) {
                  contrôle.date_prochaine_échéance = new Date(contrôle.date_prochaine_échéance);
                }
              }
            }
          }
        }

        return decisionAdministrative;
      });
    }

    if (ret.attachmentAutres) {
      ret.attachmentAutres = ret.attachmentAutres.map((attachment) => {
        if (attachment.attachment_date) {
          attachment.attachment_date = new Date(attachment.attachment_date);
        }
        if (attachment.created_at) {
          attachment.created_at = new Date(attachment.created_at);
        }

        return attachment;
      });
    }

    Object.freeze(ret);

    return ret;
  };
}

function wrapModifierDecisionAdministrative(
  url: string | undefined,
): ((body: any) => Promise<any>) | undefined {
  if (!url) return undefined;

  return (args: any) =>
    text(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
}

/**
 * Thin wrapper for multipart POST routes. The caller supplies the FormData;
 * the wrapper only attaches the cap URL and method.
 */
function wrapPOSTMultipart(
  url: string | undefined,
): ((form: FormData) => Promise<string>) | undefined {
  if (!url) return undefined;

  return async (form: FormData) => {
    const response = await fetch(url, { method: "POST", body: form });
    if (!response.ok) {
      // Surface the server's message (d3-fetch would only expose the status code).
      const body = (await response.text().catch(() => "")).trim();
      throw new Error(body || `Une erreur est survenue (${response.status})`);
    }
    return response.text();
  };
}

function wrapModifierRelationSuivi(
  url: string | undefined,
): PitchouInstructeurCapabilities["modifierRelationSuivi"] | undefined {
  if (!url) return undefined;

  return function modifierRelationSuivi(direction, personneEmail, dossierId) {
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
    listerRelationSuivi: wrapGETUrl(capURLs.listerRelationSuivi),
    modifierRelationSuivi: wrapModifierRelationSuivi(capURLs.modifierRelationSuivi),
    listerÉvènementsPhaseDossier: wrapGETUrl(capURLs.listerÉvènementsPhaseDossier),
    listerMessages: wrapListerMessages(capURLs.listerMessages),
    modifierDossier: wrapModifierDossier(capURLs.modifierDossier),
    remplirAnnotations: wrapPOSTUrl(capURLs.remplirAnnotations),
    modifierDecisionAdministrativeDansDossier: wrapModifierDecisionAdministrative(
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
    addAttachmentAutre: wrapPOSTMultipart(capURLs.addAttachmentAutre),
    deleteAvisExpert: wrapDeleteById(capURLs.deleteAvisExpert, avisExpertIdURLParam),
    // keepalive lets the request survive the page being closed, since search events
    // are flushed when the page becomes hidden (see aarri.ts)
    créerÉvènementMetrique: wrapPOSTUrl(capURLs.créerÉvènementMetrique, { keepalive: true }),
    listRecentSearches: wrapGETUrl(capURLs.listRecentSearches),
    identité: capURLs.identité,
    listerNotifications: wrapGETUrl(capURLs.listerNotifications),
    updateNotificationForDossier: wrapPOSTUrl(capURLs.updateNotificationForDossier),
  };
}
