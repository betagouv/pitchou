import { error } from "@sveltejs/kit";

import { rejectUnknownProperties } from "$lib/server/requestValidation";
import {
  phases,
  prochaineActionAttenduePar,
  prochainesActionsAttendues,
} from "@pitchou/common/phases.ts";

import type {
  DossierNextActionExpected,
  DossierNextActionExpectedFrom,
  DossierPhase,
} from "@pitchou/types/API_Pitchou.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type EvenementPhaseDossier from "@pitchou/types/database/public/EvenementPhaseDossier.ts";

export type DossierUpdate = Partial<Dossier & { evenementsPhase: EvenementPhaseDossier[] }>;

const dossierUpdateProperties = new Set([
  "next_action_expected_from",
  "next_action_expected",
  "next_due_date",
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

export function parseDossierUpdate(
  value: Record<string, unknown>,
  dossierId: DossierId,
): DossierUpdate {
  rejectUnknownProperties(value, dossierUpdateProperties);

  if (
    value.onagre_demande_identifier !== undefined &&
    typeof value.onagre_demande_identifier !== "string"
  ) {
    error(400, `La propriété 'onagre_demande_identifier' doit être une chaîne.`);
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

  if (
    value.next_action_expected !== undefined &&
    value.next_action_expected !== null &&
    (typeof value.next_action_expected !== "string" ||
      !prochainesActionsAttendues.has(value.next_action_expected as DossierNextActionExpected))
  ) {
    error(400, `La propriété 'next_action_expected' n'est pas valide.`);
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
    "next_due_date",
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

export function parseDossierId(raw: string): DossierId {
  const id = Number(raw);
  if (!Number.isFinite(id)) {
    error(400, "dossierId invalide");
  }
  return id as DossierId;
}
