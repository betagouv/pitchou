import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation";
import { phases, prochaineActionAttenduePar } from "@pitchou/common/phases.ts";
import { createTransaction } from "@pitchou/server/database.ts";
import { getDossierFull, updateDossier } from "@pitchou/server/database/dossier.ts";
import { getPersonneByDossierCap } from "@pitchou/server/database/personne.ts";
import type { DossierNextActionExpectedFrom, DossierPhase } from "@pitchou/types/API_Pitchou.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type EvenementPhaseDossier from "@pitchou/types/database/public/EvenementPhaseDossier.ts";

const dossierUpdateProperties = new Set([
  "free_comment",
  "next_action_expected_from",
  "onagre_demande_identifier",
  "enjeu",
  "ddep_required",
  "er_mesures_sufficient",
  "public_consultation_start_date",
  "public_consultation_end_date",
  "evenementsPhase",
]);

const phaseEventProperties = new Set([
  "dossier",
  "phase",
  "timestamp",
  "caused_by_personne",
  "demarche_numerique_agent_email",
  "demarche_numerique_motivation",
]);

type DossierUpdate = Partial<Dossier & { evenementsPhase: EvenementPhaseDossier[] }>;

function parsePhaseEvent(value: unknown, dossierId: DossierId): EvenementPhaseDossier {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    error(400, "Chaque évènement de phase doit être un objet.");
  }
  const event = value as Record<string, unknown>;
  rejectUnknownProperties(event, phaseEventProperties);

  if (event.dossier !== dossierId) {
    error(400, `La propriété 'dossier' de l'évènement doit valoir ${dossierId}.`);
  }
  if (typeof event.phase !== "string" || !phases.has(event.phase as DossierPhase)) {
    error(400, `La propriété 'phase' de l'évènement n'est pas valide.`);
  }
  if (typeof event.timestamp !== "string" || Number.isNaN(Date.parse(event.timestamp))) {
    error(400, `La propriété 'timestamp' de l'évènement doit être une date valide.`);
  }
  for (const property of [
    "caused_by_personne",
    "demarche_numerique_agent_email",
    "demarche_numerique_motivation",
  ] as const) {
    if (event[property] !== undefined && event[property] !== null) {
      error(400, `La propriété '${property}' de l'évènement doit être null.`);
    }
  }

  return {
    dossier: dossierId,
    phase: event.phase as DossierPhase,
    timestamp: new Date(event.timestamp),
    caused_by_personne: null,
    demarche_numerique_agent_email: null,
    demarche_numerique_motivation: null,
  };
}

function parseDossierUpdate(value: Record<string, unknown>, dossierId: DossierId): DossierUpdate {
  rejectUnknownProperties(value, dossierUpdateProperties);

  for (const property of ["free_comment", "onagre_demande_identifier"] as const) {
    if (value[property] !== undefined && typeof value[property] !== "string") {
      error(400, `La propriété '${property}' doit être une chaîne.`);
    }
  }

  if (
    value.next_action_expected_from !== undefined &&
    value.next_action_expected_from !== null &&
    (typeof value.next_action_expected_from !== "string" ||
      !prochaineActionAttenduePar.has(
        value.next_action_expected_from as DossierNextActionExpectedFrom,
      ))
  ) {
    error(400, `La propriété 'next_action_expected_from' n'est pas valide.`);
  }

  if (value.enjeu !== undefined && typeof value.enjeu !== "boolean") {
    error(400, `La propriété 'enjeu' doit être un booléen.`);
  }
  for (const property of ["ddep_required", "er_mesures_sufficient"] as const) {
    if (
      value[property] !== undefined &&
      value[property] !== null &&
      typeof value[property] !== "boolean"
    ) {
      error(400, `La propriété '${property}' doit être un booléen ou null.`);
    }
  }

  for (const property of [
    "public_consultation_start_date",
    "public_consultation_end_date",
  ] as const) {
    const rawDate = value[property];
    if (rawDate === undefined || rawDate === null) continue;
    if (typeof rawDate !== "string" || Number.isNaN(Date.parse(rawDate))) {
      error(400, `La propriété '${property}' doit être une date valide ou null.`);
    }
    value[property] = new Date(rawDate);
  }

  if (value.evenementsPhase !== undefined) {
    if (!Array.isArray(value.evenementsPhase)) {
      error(400, `La propriété 'evenementsPhase' doit être un tableau.`);
    }
    value.evenementsPhase = value.evenementsPhase.map((event) => parsePhaseEvent(event, dossierId));
  }

  return value as DossierUpdate;
}

function parseDossierId(raw: string): DossierId {
  const id = Number(raw);
  if (!Number.isFinite(id)) {
    error(400, "dossierId invalide");
  }
  return id as DossierId;
}

export const GET: RequestHandler = async ({ params, url }) => {
  const cap = requireCap(url);
  const dossierId = parseDossierId(params.dossierId!);

  const dossier = await getDossierFull(dossierId, cap);
  if (!dossier) {
    error(403, `Aucun dossier trouvé avec id '${dossierId}'`);
  }

  return json(dossier);
};

export const POST: RequestHandler = async ({ params, url, request }) => {
  const cap = requireCap(url);
  const dossierId = await requireDossierAccessByCap(parseDossierId(params.dossierId!), cap);

  const capPersonne = await getPersonneByDossierCap(cap);
  if (!capPersonne) {
    error(403, "Personne associée à la cap introuvable");
  }

  const dossierUpdate = parseDossierUpdate(await readJsonObject(request), dossierId);
  const transaction = await createTransaction();
  try {
    const updated = await updateDossier(dossierId, dossierUpdate, capPersonne.id, transaction);
    await transaction.commit();
    return json(updated);
  } catch (err) {
    if (!transaction.isCompleted()) {
      await transaction.rollback();
    }
    throw err;
  }
};
