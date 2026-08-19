import { AccessDeniedError } from "./adminEspeces.ts";
import type {
  AdminDossierCreationPayload,
  AdminDossierMinimalCreationPayload,
  AdminDossierDetail,
  AdminDossierUpdatePayload,
  AdminGroupeInstructeurs,
} from "./adminDossierTypes.ts";

export { AccessDeniedError };
export type * from "./adminDossierTypes.ts";
export { defaultDossiersQuery, loadDossiers } from "./adminDossierList.ts";

async function checkResponse(response: Response, action: string): Promise<void> {
  if (response.ok) return;
  if (response.status === 403) {
    throw new AccessDeniedError();
  }
  // Surface the server's own message (validation, DN conflict…) when available.
  let message = "";
  try {
    message = (await response.json())?.message ?? "";
  } catch {
    // no JSON body
  }
  throw new Error(message || `Erreur ${response.status} lors de ${action}.`);
}

export async function loadDossierDetail(dossierId: number): Promise<AdminDossierDetail> {
  const response = await fetch(`/api/dossiers/${dossierId}`);
  await checkResponse(response, "du chargement du dossier");
  return (await response.json()) as AdminDossierDetail;
}

export async function createDossier(
  payload: AdminDossierCreationPayload,
  speciesFile?: File | null,
  attachments: {
    purpose: File[];
    previousAssessment: File[];
    mortalityMeasures: File[];
    windFarmPlan: File[];
    eolienProtocol: File[];
    intervenantCv: File[];
    completeDossier: File[];
    noDerogationArgument: File[];
    supplemental: File[];
  } = {
    purpose: [],
    previousAssessment: [],
    mortalityMeasures: [],
    windFarmPlan: [],
    eolienProtocol: [],
    intervenantCv: [],
    completeDossier: [],
    noDerogationArgument: [],
    supplemental: [],
  },
): Promise<{ id: number }> {
  const usesMultipart =
    !!speciesFile || Object.values(attachments).some((files) => files.length >= 1);
  const body = usesMultipart
    ? (() => {
        const form = new FormData();
        form.set("payload", JSON.stringify(payload));
        if (speciesFile) form.set("speciesFile", speciesFile);
        for (const file of attachments.purpose) form.append("purposeAttachments", file);
        for (const file of attachments.previousAssessment)
          form.append("previousAssessmentAttachments", file);
        for (const file of attachments.mortalityMeasures)
          form.append("mortalityMeasureAttachments", file);
        for (const file of attachments.windFarmPlan) form.append("windFarmPlanAttachments", file);
        for (const file of attachments.eolienProtocol)
          form.append("eolienProtocolAttachments", file);
        for (const file of attachments.intervenantCv) form.append("intervenantCvAttachments", file);
        for (const file of attachments.completeDossier)
          form.append("completeDossierAttachments", file);
        for (const file of attachments.noDerogationArgument)
          form.append("noDerogationArgumentAttachments", file);
        for (const file of attachments.supplemental) form.append("supplementalAttachments", file);
        return form;
      })()
    : JSON.stringify(payload);
  const response = await fetch(`/api/dossiers`, {
    method: "POST",
    headers: usesMultipart ? undefined : { "Content-Type": "application/json" },
    body,
  });
  await checkResponse(response, "de la création du dossier");
  return (await response.json()) as { id: number };
}

export async function createMinimalDossier(
  payload: AdminDossierMinimalCreationPayload,
): Promise<{ id: number }> {
  const response = await fetch(`/api/dossiers/minimal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await checkResponse(response, "de la création du dossier");
  return (await response.json()) as { id: number };
}

export async function updateDossier(
  dossierId: number,
  payload: AdminDossierUpdatePayload,
  speciesFile: File | null = null,
  attachments: File[] = [],
): Promise<AdminDossierDetail> {
  const usesMultipart = !!speciesFile || attachments.length >= 1;
  const body = usesMultipart
    ? (() => {
        const form = new FormData();
        form.set("payload", JSON.stringify(payload));
        if (speciesFile) form.set("speciesFile", speciesFile);
        for (const file of attachments) form.append("attachments", file);
        return form;
      })()
    : JSON.stringify(payload);
  const response = await fetch(`/api/dossiers/${dossierId}`, {
    method: "PUT",
    headers: usesMultipart ? undefined : { "Content-Type": "application/json" },
    body,
  });
  await checkResponse(response, "de la modification du dossier");
  return (await response.json()) as AdminDossierDetail;
}

export async function deleteDossier(dossierId: number): Promise<void> {
  const response = await fetch(`/api/dossiers/${dossierId}`, { method: "DELETE" });
  await checkResponse(response, "de la suppression du dossier");
}

export async function uploadPieceJointe(dossierId: number, file: File): Promise<void> {
  const form = new FormData();
  form.set("file", file);
  const response = await fetch(`/api/dossiers/${dossierId}/pieces-jointes`, {
    method: "POST",
    body: form,
  });
  await checkResponse(response, "de l'ajout de la pièce jointe");
}

export async function deletePieceJointe(dossierId: number, fichierId: string): Promise<void> {
  const response = await fetch(`/api/dossiers/${dossierId}/pieces-jointes/${fichierId}`, {
    method: "DELETE",
  });
  await checkResponse(response, "de la suppression de la pièce jointe");
}

export async function uploadEspecesImpactees(dossierId: number, file: File): Promise<void> {
  const form = new FormData();
  form.set("file", file);
  const response = await fetch(`/api/dossiers/${dossierId}/especes-impactees`, {
    method: "POST",
    body: form,
  });
  await checkResponse(response, "de l'envoi du fichier espèces impactées");
}

export async function deleteEspecesImpactees(dossierId: number): Promise<void> {
  const response = await fetch(`/api/dossiers/${dossierId}/especes-impactees`, {
    method: "DELETE",
  });
  await checkResponse(response, "de la suppression du fichier espèces impactées");
}

export async function loadGroupesInstructeurs(): Promise<AdminGroupeInstructeurs[]> {
  const response = await fetch(`/api/groupes-instructeurs`);
  await checkResponse(response, "du chargement des groupes instructeurs");

  const groupes = await response.json();
  if (!Array.isArray(groupes)) {
    throw new Error("Réponse invalide reçue du serveur pour les groupes instructeurs.");
  }
  return groupes as AdminGroupeInstructeurs[];
}

/** An entry of a dossier's historique, as returned by the synchronization simulation. */
export type SimulatedAction = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  created_at: string | Date;
  author_petitionnaire: boolean;
};

/**
 * Replays a pétitionnaire modification through the real synchronization path.
 * Only available outside production.
 */
export async function simulateDossierSync(
  dossierId: number,
  champ: string,
  valeur: string,
): Promise<{ changed: boolean; actions: SimulatedAction[] }> {
  const response = await fetch(`/api/dossiers/${dossierId}/simuler-synchronisation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ champ, valeur }),
  });
  await checkResponse(response, "de la simulation de synchronisation");
  return await response.json();
}
