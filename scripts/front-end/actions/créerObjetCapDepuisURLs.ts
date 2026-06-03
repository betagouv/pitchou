import { json, text } from "d3-fetch";

import type { StringValues } from "../../types/tools.d.ts";
import type {
  IdentitéInstructeurPitchou,
  PitchouInstructeurCapabilities,
} from "../../types/capabilities.ts";
import type { default as Dossier } from "../../types/database/public/Dossier.ts";
import type { default as Message } from "../../types/database/public/Message.ts";
import type { DossierComplet } from "../../types/API_Pitchou.ts";

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

function wrapRecupérerDossierComplet(
  url: string | undefined,
): ((dossierId: Dossier["id"]) => Promise<DossierComplet>) | undefined {
  if (!url) return undefined;

  if (!url.includes(dossierIdURLParam)) {
    throw new Error(`La capability listerMessages ne contient pas '${dossierIdURLParam}'`);
  }

  /**
   * Récupère les données du dossier et les formatte.
   */
  return async function getDossierComplet(dossierId: Dossier["id"]): Promise<DossierComplet> {
    const ret: DossierComplet | undefined = await json(
      // @ts-ignore
      url.replace(dossierIdURLParam, dossierId),
      commonRequestInit,
    );

    if (!ret) {
      throw new TypeError(`Aucun dossier trouvé avec id '${dossierId}'`);
    }

    // Formattage des dates
    if (ret.date_début_intervention) {
      ret.date_début_intervention = new Date(ret.date_début_intervention);
    }
    if (ret.date_fin_intervention) {
      ret.date_fin_intervention = new Date(ret.date_fin_intervention);
    }
    if (ret.date_dépôt) {
      ret.date_dépôt = new Date(ret.date_dépôt);
    }

    // Le contenu du fichier espèces impactées est disponible sous forme de string base64 dans le JSON
    // le retransformer en ArrayBuffer pour utilisation côté front-end
    if (ret.espècesImpactées) {
      // @ts-ignore
      ret.espècesImpactées.contenu = Uint8Array.from(atob(ret.espècesImpactées.contenu), (c) =>
        c.charCodeAt(0),
      ).buffer;
    }

    if (ret.espècesImpactées) {
      Object.freeze(ret.espècesImpactées);
    }
    if (ret.évènementsPhase) {
      Object.freeze(ret.évènementsPhase);
    }

    // les dates récupérées du JSON sont des string
    // ici, on les re-transforme en Dates
    if (ret.décisionsAdministratives) {
      ret.décisionsAdministratives = ret.décisionsAdministratives.map((décisionAdministrative) => {
        if (décisionAdministrative.date_signature) {
          décisionAdministrative.date_signature = new Date(décisionAdministrative.date_signature);
        }
        if (décisionAdministrative.date_fin_obligations) {
          décisionAdministrative.date_fin_obligations = new Date(
            décisionAdministrative.date_fin_obligations,
          );
        }

        if (Array.isArray(décisionAdministrative.prescriptions)) {
          for (const p of décisionAdministrative.prescriptions) {
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

        return décisionAdministrative;
      });
    }

    Object.freeze(ret);

    return ret;
  };
}

function wrapModifierDécisionAdministrative(
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

  return (form: FormData) => text(url, { method: "POST", body: form });
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
    identité: IdentitéInstructeurPitchou;
  },
): Partial<PitchouInstructeurCapabilities> & { identité: IdentitéInstructeurPitchou } {
  return {
    listerDossiers: wrapGETUrl(capURLs.listerDossiers),
    recupérerDossierComplet: wrapRecupérerDossierComplet(capURLs.recupérerDossierComplet),
    listerRelationSuivi: wrapGETUrl(capURLs.listerRelationSuivi),
    modifierRelationSuivi: wrapModifierRelationSuivi(capURLs.modifierRelationSuivi),
    listerÉvènementsPhaseDossier: wrapGETUrl(capURLs.listerÉvènementsPhaseDossier),
    listerMessages: wrapListerMessages(capURLs.listerMessages),
    modifierDossier: wrapModifierDossier(capURLs.modifierDossier),
    remplirAnnotations: wrapPOSTUrl(capURLs.remplirAnnotations),
    modifierDécisionAdministrativeDansDossier: wrapModifierDécisionAdministrative(
      capURLs.modifierDécisionAdministrativeDansDossier,
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
    deleteAvisExpert: wrapDeleteById(capURLs.deleteAvisExpert, avisExpertIdURLParam),
    créerÉvènementMetrique: wrapPOSTUrl(capURLs.créerÉvènementMetrique),
    identité: capURLs.identité,
    listerNotifications: wrapGETUrl(capURLs.listerNotifications),
    updateNotificationForDossier: wrapPOSTUrl(capURLs.updateNotificationForDossier),
  };
}
