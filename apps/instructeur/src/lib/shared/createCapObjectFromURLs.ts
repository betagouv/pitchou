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

function wrapPOSTUrl(url: string | undefined): ((body: any) => Promise<any>) | undefined {
  if (!url) return undefined;

  return (args: any) =>
    json(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
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
    if (ret.intervention_start_date) {
      ret.intervention_start_date = new Date(ret.intervention_start_date);
    }
    if (ret.intervention_end_date) {
      ret.intervention_end_date = new Date(ret.intervention_end_date);
    }
    if (ret.depot_date) {
      ret.depot_date = new Date(ret.depot_date);
    }

    // The espèces impactées file is served on demand via espècesImpactées.url
    if (ret.especesImpactees) {
      Object.freeze(ret.especesImpactees);
    }
    if (ret.evenementsPhase) {
      Object.freeze(ret.evenementsPhase);
    }

    // the dates fetched from the JSON are strings
    // here, we convert them back into Dates
    if (ret.decisionsAdministratives) {
      ret.decisionsAdministratives = ret.decisionsAdministratives.map((decisionAdministrative) => {
        if (decisionAdministrative.signature_date) {
          decisionAdministrative.signature_date = new Date(decisionAdministrative.signature_date);
        }
        if (decisionAdministrative.obligations_end_date) {
          decisionAdministrative.obligations_end_date = new Date(
            decisionAdministrative.obligations_end_date,
          );
        }

        if (Array.isArray(decisionAdministrative.prescriptions)) {
          for (const p of decisionAdministrative.prescriptions) {
            if (p.due_date) p.due_date = new Date(p.due_date);

            if (Array.isArray(p.controles)) {
              for (const controle of p.controles) {
                if (controle.controle_date) {
                  controle.controle_date = new Date(controle.controle_date);
                }
                if (controle.post_controle_action_date) {
                  controle.post_controle_action_date = new Date(controle.post_controle_action_date);
                }
                if (controle.next_due_date) {
                  controle.next_due_date = new Date(controle.next_due_date);
                }
              }
            }
          }
        }

        return decisionAdministrative;
      });
    }

    if (ret.otherAttachments) {
      ret.otherAttachments = ret.otherAttachments.map((attachment) => {
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
    listerEvenementsPhaseDossier: wrapGETUrl(capURLs.listerEvenementsPhaseDossier),
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
    addOtherAttachment: wrapPOSTMultipart(capURLs.addOtherAttachment),
    deleteAvisExpert: wrapDeleteById(capURLs.deleteAvisExpert, avisExpertIdURLParam),
    creerEvenementMetrique: wrapPOSTUrl(capURLs.creerEvenementMetrique),
    identité: capURLs.identité,
    listerNotifications: wrapGETUrl(capURLs.listerNotifications),
    updateNotificationForDossier: wrapPOSTUrl(capURLs.updateNotificationForDossier),
  };
}
